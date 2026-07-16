import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadStatus,
  NotificationReferenceType,
  Prisma,
  Role,
  TaskReferenceType,
  UserStatus,
} from '@prisma/client';
import {
  read,
  utils,
  write,
} from 'xlsx';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  assertBranchAccess,
  getScopedBranchId,
} from '../auth/utils/branch-access.util';
import {
  createPaginationMeta,
  normalizePagination,
} from '../common/utils/pagination.util';
import { EmployeeTasksService } from '../employee-tasks/employee-tasks.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddLeadNoteDto } from './dto/add-lead-note.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

type UploadedFileLike = {
  buffer?: Buffer;
  originalname?: string;
};

type ImportLookupBranch = {
  id: string;
  supplierName: string;
};

type ImportLookupProductService = {
  id: string;
  name: string;
};

type LeadImportPreviewRow = {
  rowNumber: number;
  leadName: string;
  customerName: string;
  phone: string;
  email: string | null;
  location: string;
  branch: string;
  source: string;
  interestedProductService: string;
  status: LeadStatus;
  note: string | null;
  nextFollowUpDate: string | null;
  branchId: string | null;
  branchName: string | null;
  interestedProductServiceId: string | null;
  interestedProductServiceName: string | null;
  isValid: boolean;
  errors: string[];
};

type LeadImportPreview = {
  mode: 'preview' | 'imported';
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    importedRows: number;
  };
  rows: LeadImportPreviewRow[];
};

const supplierSummarySelect = Prisma.validator<Prisma.SupplierSelect>()({
  id: true,
  supplierName: true,
  phone: true,
  gstin: true,
  status: true,
});

const productServiceSummarySelect =
  Prisma.validator<Prisma.ProductServiceSelect>()({
    id: true,
    name: true,
    type: true,
    hsnSacCode: true,
    status: true,
  });

const employeeSummarySelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  username: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  branchId: true,
});

const leadListSelect = Prisma.validator<Prisma.LeadSelect>()({
  id: true,
  leadName: true,
  customerName: true,
  phone: true,
  email: true,
  location: true,
  branchId: true,
  branchName: true,
  source: true,
  interestedProductServiceId: true,
  assignedToEmployeeId: true,
  assignedAt: true,
  status: true,
  note: true,
  nextFollowUpDate: true,
  createdAt: true,
  updatedAt: true,
  branch: {
    select: supplierSummarySelect,
  },
  interestedProductService: {
    select: productServiceSummarySelect,
  },
  assignedToEmployee: {
    select: employeeSummarySelect,
  },
});

const leadNoteSelect = Prisma.validator<Prisma.LeadNoteSelect>()({
  id: true,
  leadId: true,
  note: true,
  createdById: true,
  createdByName: true,
  createdAt: true,
});

const leadStatusHistorySelect =
  Prisma.validator<Prisma.LeadStatusHistorySelect>()({
    id: true,
    leadId: true,
    status: true,
    note: true,
    nextFollowUpDate: true,
    changedById: true,
    changedByName: true,
    createdAt: true,
  });

const leadSuggestionSelect = Prisma.validator<Prisma.LeadSelect>()({
  id: true,
  leadName: true,
  customerName: true,
  phone: true,
  email: true,
  location: true,
  branchId: true,
  branchName: true,
  source: true,
  interestedProductServiceId: true,
  assignedToEmployeeId: true,
  interestedProductService: {
    select: {
      id: true,
      name: true,
    },
  },
});

const DEMO_EXCEL_COLUMNS = [
  'Lead Name',
  'Customer Name',
  'Phone',
  'Email',
  'Location',
  'Branch',
  'Source',
  'Interested Product/Service',
  'Status',
  'Note',
  'Next Follow Up Date',
] as const;

type LeadListRecord = Prisma.LeadGetPayload<{
  select: typeof leadListSelect;
}>;

type LeadNoteRecord = Prisma.LeadNoteGetPayload<{
  select: typeof leadNoteSelect;
}>;

type LeadStatusHistoryRecord = Prisma.LeadStatusHistoryGetPayload<{
  select: typeof leadStatusHistorySelect;
}>;

type LeadSuggestionRecord = Prisma.LeadGetPayload<{
  select: typeof leadSuggestionSelect;
}>;

type LeadPerformanceRecord = {
  employeeId: string;
  employeeName: string;
  username: string;
  role: Role;
  status: UserStatus;
  totalLeadsAssigned: number;
  convertedLeads: number;
  lostLeads: number;
  followUpsDue: number;
  conversionPercentage: number;
};

@Injectable()
export class LeadsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly employeeTasksService: EmployeeTasksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listLeads(query: ListLeadsQueryDto, currentUser: JwtPayload) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();
    const dateRange = this.buildCreatedAtRange(query.fromDate, query.toDate);
    const scopedBranchId = getScopedBranchId(currentUser);
    const where: Prisma.LeadWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(scopedBranchId ? { branchId: scopedBranchId } : query.branchId ? { branchId: query.branchId } : {}),
      ...(query.assignedToEmployeeId
        ? { assignedToEmployeeId: query.assignedToEmployeeId }
        : {}),
      ...(currentUser.role === Role.EMPLOYEE
        ? { assignedToEmployeeId: currentUser.sub }
        : {}),
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(search
        ? {
            OR: [
              {
                leadName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                customerName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                phone: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                location: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                source: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                branchName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                interestedProductService: {
                  is: {
                    name: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                assignedToEmployee: {
                  is: {
                    name: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                assignedToEmployee: {
                  is: {
                    username: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, leads] = await Promise.all([
      this.prismaService.lead.count({ where }),
      this.prismaService.lead.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { leadName: 'asc' }],
        skip,
        take: limit,
        select: leadListSelect,
      }),
    ]);

    return {
      data: leads,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getLeadById(leadId: string, currentUser: JwtPayload) {
    const lead = await this.getLeadDetailsOrThrow(leadId);
    this.ensureLeadAccessible(lead, currentUser);
    return lead;
  }

  async createLead(
    createLeadDto: CreateLeadDto,
    currentUser: JwtPayload,
  ) {
    const scopedBranchId = getScopedBranchId(currentUser);
    const branchId = scopedBranchId ?? createLeadDto.branchId;
    const branch = await this.getSupplierOrThrow(branchId);
    const interestedProductService = await this.getProductServiceOrThrow(
      createLeadDto.interestedProductServiceId,
    );
    const assignedEmployeeId = this.normalizeOptionalString(
      createLeadDto.assignedToEmployeeId,
    );
    const assignedEmployee = assignedEmployeeId
      ? await this.getAssignableEmployeeOrThrow(assignedEmployeeId)
      : null;
    this.ensureAssignableEmployeeInBranch(assignedEmployee, currentUser);
    const note = this.normalizeOptionalString(createLeadDto.note);
    const nextFollowUpDate = this.toDateOrNull(createLeadDto.nextFollowUpDate);
    const status = createLeadDto.status ?? LeadStatus.NEW;

    const lead = await this.prismaService.lead.create({
      data: {
        leadName: createLeadDto.leadName.trim(),
        customerName: createLeadDto.customerName.trim(),
        phone: createLeadDto.phone.trim(),
        email: this.normalizeOptionalString(createLeadDto.email),
        location: createLeadDto.location.trim(),
        branchId: branch.id,
        branchName: branch.supplierName,
        source: createLeadDto.source.trim(),
        interestedProductServiceId: interestedProductService.id,
        assignedToEmployeeId: assignedEmployee?.id ?? null,
        assignedAt: assignedEmployee ? new Date() : null,
        status,
        note,
        nextFollowUpDate,
        ...(note
          ? {
              notes: {
                create: [
                  {
                    note,
                    createdById: currentUser.sub,
                    createdByName: currentUser.name,
                  },
                ],
              },
            }
          : {}),
        statusHistory: {
          create: [
            {
              status,
              note,
              nextFollowUpDate,
              changedById: currentUser.sub,
              changedByName: currentUser.name,
            },
          ],
        },
      },
      select: {
        id: true,
      },
    });

    const createdLead = await this.getLeadDetailsOrThrow(lead.id);
    await this.employeeTasksService.syncLeadTask(createdLead.id);
    await this.notifyAssignedLead(createdLead, assignedEmployee?.id ?? null);

    return createdLead;
  }

  async updateLead(
    leadId: string,
    updateLeadDto: UpdateLeadDto,
    currentUser: JwtPayload,
  ) {
    const existingLead = await this.getLeadDetailsOrThrow(leadId);
    this.ensureLeadAccessible(existingLead, currentUser);
    const scopedBranchId = getScopedBranchId(currentUser);
    const branchId =
      updateLeadDto.branchId !== undefined
        ? scopedBranchId ?? updateLeadDto.branchId
        : null;
    const branch = branchId ? await this.getSupplierOrThrow(branchId) : null;
    const interestedProductService = updateLeadDto.interestedProductServiceId
      ? await this.getProductServiceOrThrow(
          updateLeadDto.interestedProductServiceId,
        )
      : null;
    const hasAssignedEmployeeField = Object.prototype.hasOwnProperty.call(
      updateLeadDto,
      'assignedToEmployeeId',
    );
    const assignedEmployeeId = this.normalizeOptionalString(
      updateLeadDto.assignedToEmployeeId,
    );
    const assignedEmployee =
      hasAssignedEmployeeField && assignedEmployeeId
        ? await this.getAssignableEmployeeOrThrow(assignedEmployeeId)
        : null;
    this.ensureAssignableEmployeeInBranch(assignedEmployee, currentUser);
    const normalizedNote = this.normalizeOptionalString(updateLeadDto.note);
    const hasNoteField = Object.prototype.hasOwnProperty.call(
      updateLeadDto,
      'note',
    );
    const hasFollowUpField = Object.prototype.hasOwnProperty.call(
      updateLeadDto,
      'nextFollowUpDate',
    );
    const nextFollowUpDate = hasFollowUpField
      ? this.toDateOrNull(updateLeadDto.nextFollowUpDate)
      : existingLead.nextFollowUpDate;
    const status = updateLeadDto.status ?? existingLead.status;
    const shouldCreateStatusHistory =
      updateLeadDto.status !== undefined &&
      (updateLeadDto.status !== existingLead.status ||
        hasFollowUpField ||
        normalizedNote !== null);
    const shouldCreateNote =
      normalizedNote !== null && normalizedNote !== existingLead.note;
    const assignedEmployeeChanged =
      hasAssignedEmployeeField &&
      assignedEmployeeId !== existingLead.assignedToEmployeeId;

    await this.prismaService.lead.update({
      where: {
        id: leadId,
      },
      data: {
        ...(updateLeadDto.leadName !== undefined
          ? {
              leadName: updateLeadDto.leadName.trim(),
            }
          : {}),
        ...(updateLeadDto.customerName !== undefined
          ? {
              customerName: updateLeadDto.customerName.trim(),
            }
          : {}),
        ...(updateLeadDto.phone !== undefined
          ? {
              phone: updateLeadDto.phone.trim(),
            }
          : {}),
        ...(updateLeadDto.email !== undefined
          ? {
              email: this.normalizeOptionalString(updateLeadDto.email),
            }
          : {}),
        ...(updateLeadDto.location !== undefined
          ? {
              location: updateLeadDto.location.trim(),
            }
          : {}),
        ...(branch
          ? {
              branchId: branch.id,
              branchName: branch.supplierName,
            }
          : {}),
        ...(updateLeadDto.source !== undefined
          ? {
              source: updateLeadDto.source.trim(),
            }
          : {}),
        ...(interestedProductService
          ? {
              interestedProductServiceId: interestedProductService.id,
            }
          : {}),
        ...(hasAssignedEmployeeField
          ? {
              assignedToEmployeeId: assignedEmployee?.id ?? null,
              assignedAt: assignedEmployee
                ? assignedEmployeeChanged
                  ? new Date()
                  : existingLead.assignedAt
                : null,
            }
          : {}),
        ...(updateLeadDto.status !== undefined
          ? {
              status: updateLeadDto.status,
            }
          : {}),
        ...(hasNoteField
          ? {
              note: normalizedNote,
            }
          : {}),
        ...(hasFollowUpField
          ? {
              nextFollowUpDate,
            }
          : {}),
        ...(shouldCreateNote
          ? {
              notes: {
                create: [
                  {
                    note: normalizedNote!,
                    createdById: currentUser.sub,
                    createdByName: currentUser.name,
                  },
                ],
              },
            }
          : {}),
        ...(shouldCreateStatusHistory
          ? {
              statusHistory: {
                create: [
                  {
                    status,
                    note: normalizedNote,
                    nextFollowUpDate,
                    changedById: currentUser.sub,
                    changedByName: currentUser.name,
                  },
                ],
              },
            }
          : {}),
      },
    });

    const updatedLead = await this.getLeadDetailsOrThrow(leadId);
    await this.employeeTasksService.syncLeadTask(updatedLead.id);
    if (assignedEmployeeChanged) {
      await this.notifyAssignedLead(updatedLead, assignedEmployee?.id ?? null);
    }

    return updatedLead;
  }

  async updateLeadStatus(
    leadId: string,
    updateLeadStatusDto: UpdateLeadStatusDto,
    currentUser: JwtPayload,
  ) {
    const existingLead = await this.getLeadDetailsOrThrow(leadId);
    this.ensureLeadAccessible(existingLead, currentUser);

    const note = this.normalizeOptionalString(updateLeadStatusDto.note);
    const nextFollowUpDate = this.toDateOrNull(
      updateLeadStatusDto.nextFollowUpDate,
    );

    await this.prismaService.lead.update({
      where: {
        id: leadId,
      },
      data: {
        status: updateLeadStatusDto.status,
        ...(note !== null
          ? {
              note,
            }
          : {}),
        nextFollowUpDate,
        ...(note !== null
          ? {
              notes: {
                create: [
                  {
                    note,
                    createdById: currentUser.sub,
                    createdByName: currentUser.name,
                  },
                ],
              },
            }
          : {}),
        statusHistory: {
          create: [
            {
              status: updateLeadStatusDto.status,
              note,
              nextFollowUpDate,
              changedById: currentUser.sub,
              changedByName: currentUser.name,
            },
          ],
        },
      },
    });

    const updatedLead = await this.getLeadDetailsOrThrow(leadId);
    await this.employeeTasksService.syncLeadTask(updatedLead.id);

    return updatedLead;
  }

  async listLeadSuggestions(query: string | undefined, currentUser: JwtPayload) {
    const search = query?.trim();
    const scopedBranchId = getScopedBranchId(currentUser);

    if (!search || search.length < 2) {
      return [] as LeadSuggestionRecord[];
    }

    return this.prismaService.lead.findMany({
      where: {
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
        OR: [
          {
            leadName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            customerName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            phone: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: [{ updatedAt: 'desc' }, { leadName: 'asc' }],
      take: 8,
      select: leadSuggestionSelect,
    });
  }

  async getLeadPerformance(
    query: ListLeadsQueryDto,
    currentUser: JwtPayload,
  ) {
    const search = query.search?.trim();
    const dateRange = this.buildCreatedAtRange(query.fromDate, query.toDate);
    const today = this.startOfDay(new Date());
    const scopedBranchId = getScopedBranchId(currentUser);
    const where: Prisma.LeadWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(scopedBranchId ? { branchId: scopedBranchId } : query.branchId ? { branchId: query.branchId } : {}),
      ...(query.assignedToEmployeeId
        ? { assignedToEmployeeId: query.assignedToEmployeeId }
        : {}),
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(search
        ? {
            OR: [
              {
                leadName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                customerName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                phone: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                location: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                source: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                branchName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                interestedProductService: {
                  is: {
                    name: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                assignedToEmployee: {
                  is: {
                    name: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                assignedToEmployee: {
                  is: {
                    username: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [employees, leads] = await Promise.all([
      this.prismaService.user.findMany({
        where: {
          role: Role.EMPLOYEE,
          status: UserStatus.ACTIVE,
          ...(query.assignedToEmployeeId ? { id: query.assignedToEmployeeId } : {}),
        },
        orderBy: [{ name: 'asc' }],
        select: employeeSummarySelect,
      }),
      this.prismaService.lead.findMany({
        where,
        select: {
          assignedToEmployeeId: true,
          status: true,
          nextFollowUpDate: true,
        },
      }),
    ]);

    const leadMap = new Map<string, typeof leads>();
    for (const employee of employees) {
      leadMap.set(employee.id, []);
    }

    for (const lead of leads) {
      if (!lead.assignedToEmployeeId) {
        continue;
      }

      const current = leadMap.get(lead.assignedToEmployeeId);
      if (current) {
        current.push(lead);
      }
    }

    const employeePerformance: LeadPerformanceRecord[] = employees.map((employee) => {
      const assignedLeads = leadMap.get(employee.id) ?? [];
      const totalLeadsAssigned = assignedLeads.length;
      const convertedLeads = assignedLeads.filter(
        (lead) => lead.status === LeadStatus.CONVERTED,
      ).length;
      const lostLeads = assignedLeads.filter(
        (lead) => lead.status === LeadStatus.LOST,
      ).length;
      const followUpsDue = assignedLeads.filter((lead) => {
        if (!lead.nextFollowUpDate) {
          return false;
        }

        if (
          lead.status === LeadStatus.CONVERTED ||
          lead.status === LeadStatus.LOST
        ) {
          return false;
        }

        return this.startOfDay(lead.nextFollowUpDate) <= today;
      }).length;

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        username: employee.username,
        role: employee.role,
        status: employee.status,
        totalLeadsAssigned,
        convertedLeads,
        lostLeads,
        followUpsDue,
        conversionPercentage: this.toPercentage(
          convertedLeads,
          totalLeadsAssigned,
        ),
      };
    });

    const totals = employeePerformance.reduce(
      (summary, employee) => ({
        totalLeadsAssigned:
          summary.totalLeadsAssigned + employee.totalLeadsAssigned,
        convertedLeads: summary.convertedLeads + employee.convertedLeads,
        lostLeads: summary.lostLeads + employee.lostLeads,
        followUpsDue: summary.followUpsDue + employee.followUpsDue,
      }),
      {
        totalLeadsAssigned: 0,
        convertedLeads: 0,
        lostLeads: 0,
        followUpsDue: 0,
      },
    );

    return {
      summary: {
        ...totals,
        conversionPercentage: this.toPercentage(
          totals.convertedLeads,
          totals.totalLeadsAssigned,
        ),
      },
      employees: employeePerformance,
    };
  }

  async deleteLead(leadId: string, currentUser: JwtPayload) {
    const lead = await this.getLeadDetailsOrThrow(leadId);
    this.ensureLeadAccessible(lead, currentUser);

    await this.prismaService.employeeTask.deleteMany({
      where: {
        referenceType: TaskReferenceType.LEAD,
        referenceId: leadId,
      },
    });

    return this.prismaService.lead.delete({
      where: {
        id: leadId,
      },
      select: leadListSelect,
    });
  }

  async getLeadNotes(
    leadId: string,
    currentUser: JwtPayload,
  ): Promise<LeadNoteRecord[]> {
    const lead = await this.getLeadDetailsOrThrow(leadId);
    this.ensureLeadAccessible(lead, currentUser);

    return this.prismaService.leadNote.findMany({
      where: {
        leadId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: leadNoteSelect,
    });
  }

  async addLeadNote(
    leadId: string,
    addLeadNoteDto: AddLeadNoteDto,
    currentUser: JwtPayload,
  ) {
    const lead = await this.getLeadDetailsOrThrow(leadId);
    this.ensureLeadAccessible(lead, currentUser);

    const note = addLeadNoteDto.note.trim();
    if (!note) {
      throw new BadRequestException('Lead note cannot be empty');
    }

    const [leadNote] = await this.prismaService.$transaction([
      this.prismaService.leadNote.create({
        data: {
          leadId,
          note,
          createdById: currentUser.sub,
          createdByName: currentUser.name,
        },
        select: leadNoteSelect,
      }),
      this.prismaService.lead.update({
        where: {
          id: leadId,
        },
        data: {
          note,
        },
        select: {
          id: true,
        },
      }),
    ]);

    return leadNote;
  }

  async importLeads(
    file: UploadedFileLike | undefined,
    commit: boolean,
    currentUser: JwtPayload,
  ): Promise<LeadImportPreview> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Upload an Excel file to import leads');
    }

    const preview = await this.buildImportPreview(file.buffer);

    if (!commit) {
      return preview;
    }

    if (preview.summary.invalidRows > 0) {
      throw new BadRequestException({
        message: 'Lead import contains validation errors',
        ...preview,
      });
    }

    const validRows = preview.rows.filter((row) => row.isValid);
    const scopedBranchId = getScopedBranchId(currentUser);
    const scopedBranch = scopedBranchId
      ? await this.getSupplierOrThrow(scopedBranchId)
      : null;

    await this.prismaService.$transaction(async (transaction) => {
      for (const row of validRows) {
        const branchId = scopedBranchId ?? row.branchId!;
        const branchName = scopedBranch?.supplierName ?? row.branchName!;
        assertBranchAccess(currentUser, branchId);
        const nextFollowUpDate = row.nextFollowUpDate
          ? new Date(row.nextFollowUpDate)
          : null;

        await transaction.lead.create({
          data: {
            leadName: row.leadName,
            customerName: row.customerName,
            phone: row.phone,
            email: row.email,
            location: row.location,
            branchId,
            branchName,
            source: row.source,
            interestedProductServiceId: row.interestedProductServiceId!,
            status: row.status,
            note: row.note,
            nextFollowUpDate,
            ...(row.note
              ? {
                  notes: {
                    create: [
                      {
                        note: row.note,
                        createdById: currentUser.sub,
                        createdByName: currentUser.name,
                      },
                    ],
                  },
                }
              : {}),
            statusHistory: {
              create: [
                {
                  status: row.status,
                  note: row.note,
                  nextFollowUpDate,
                  changedById: currentUser.sub,
                  changedByName: currentUser.name,
                },
              ],
            },
          },
        });
      }
    });

    return {
      mode: 'imported',
      summary: {
        ...preview.summary,
        importedRows: validRows.length,
      },
      rows: preview.rows,
    };
  }

  getDemoExcel(): { fileName: string; buffer: Buffer } {
    const worksheet = utils.json_to_sheet([
      {
        'Lead Name': 'Cold Room Upgrade Opportunity',
        'Customer Name': 'Sunrise Medical Center',
        Phone: '+91-9000000011',
        Email: 'facilities@sunrise.example.com',
        Location: 'Bengaluru',
        Branch: 'Southline Industrial Services',
        Source: 'Referral',
        'Interested Product/Service': 'Annual Maintenance Contract',
        Status: 'NEW',
        Note: 'Requested a callback for annual maintenance options.',
        'Next Follow Up Date': '2026-06-30',
      },
    ]);

    utils.sheet_add_aoa(worksheet, [DEMO_EXCEL_COLUMNS as unknown as string[]], {
      origin: 'A1',
    });

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Lead Import Demo');

    return {
      fileName: 'lead-import-demo.xlsx',
      buffer: write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      }) as Buffer,
    };
  }

  private async getLeadDetailsOrThrow(leadId: string) {
    const lead = await this.prismaService.lead.findUnique({
      where: {
        id: leadId,
      },
      select: {
        ...leadListSelect,
        notes: {
          orderBy: {
            createdAt: 'desc',
          },
          select: leadNoteSelect,
        },
        statusHistory: {
          orderBy: {
            createdAt: 'desc',
          },
          select: leadStatusHistorySelect,
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  private async notifyAssignedLead(
    lead: Awaited<ReturnType<LeadsService['getLeadDetailsOrThrow']>>,
    assignedEmployeeId: string | null,
  ): Promise<void> {
    if (!assignedEmployeeId) {
      return;
    }

    await this.notificationsService.notifyUsers([assignedEmployeeId], {
      title: 'Lead assigned',
      message: `${lead.leadName} was assigned to you for follow-up.`,
      referenceType: NotificationReferenceType.LEAD,
      referenceId: lead.id,
    });
  }

  private ensureLeadAccessible(
    lead: Awaited<ReturnType<LeadsService['getLeadDetailsOrThrow']>>,
    currentUser: JwtPayload,
  ): void {
    assertBranchAccess(currentUser, lead.branchId, 'Lead not found');

    if (
      currentUser.role === Role.EMPLOYEE &&
      lead.assignedToEmployeeId !== currentUser.sub
    ) {
      throw new NotFoundException('Lead not found');
    }
  }

  private async getSupplierOrThrow(supplierId: string) {
    const supplier = await this.prismaService.supplier.findUnique({
      where: {
        id: supplierId,
      },
      select: supplierSummarySelect,
    });

    if (!supplier) {
      throw new NotFoundException('Branch not found');
    }

    return supplier;
  }

  private async getProductServiceOrThrow(productServiceId: string) {
    const productService = await this.prismaService.productService.findUnique({
      where: {
        id: productServiceId,
      },
      select: productServiceSummarySelect,
    });

    if (!productService) {
      throw new NotFoundException('Product or service not found');
    }

    return productService;
  }

  private async getAssignableEmployeeOrThrow(employeeId: string) {
    const employee = await this.prismaService.user.findUnique({
      where: {
        id: employeeId,
      },
      select: employeeSummarySelect,
    });

    if (!employee) {
      throw new NotFoundException('Assigned employee not found');
    }

    if (employee.role !== Role.ADMIN && employee.role !== Role.EMPLOYEE) {
      throw new BadRequestException(
        'Assigned employee must be an admin or employee',
      );
    }

    if (employee.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Assigned employee must be active');
    }

    return employee;
  }

  private ensureAssignableEmployeeInBranch(
    employee: { branchId: string | null } | null,
    currentUser: JwtPayload,
  ): void {
    if (!employee) {
      return;
    }

    assertBranchAccess(
      currentUser,
      employee.branchId,
      'Assigned employee must belong to your branch',
    );
  }

  private buildCreatedAtRange(
    fromDate?: string,
    toDate?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!fromDate && !toDate) {
      return undefined;
    }

    const range: Prisma.DateTimeFilter = {};

    if (fromDate) {
      const start = new Date(fromDate);
      start.setUTCHours(0, 0, 0, 0);
      range.gte = start;
    }

    if (toDate) {
      const end = new Date(toDate);
      end.setUTCHours(23, 59, 59, 999);
      range.lte = end;
    }

    return range;
  }

  private toDateOrNull(value?: string): Date | null {
    const normalizedValue = this.normalizeOptionalString(value);
    return normalizedValue ? new Date(normalizedValue) : null;
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private toPercentage(value: number, total: number): number {
    if (total <= 0) {
      return 0;
    }

    return Math.round((value / total) * 10000) / 100;
  }

  private normalizeOptionalString(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private async buildImportPreview(buffer: Buffer): Promise<LeadImportPreview> {
    const workbook = read(buffer, {
      type: 'buffer',
      raw: false,
    });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new BadRequestException('The uploaded Excel file does not contain a worksheet');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
      raw: false,
    });

    if (rows.length === 0) {
      throw new BadRequestException('The uploaded Excel file is empty');
    }

    const [branches, productServices] = await Promise.all([
      this.prismaService.supplier.findMany({
        select: {
          id: true,
          supplierName: true,
        },
      }),
      this.prismaService.productService.findMany({
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    const branchLookup = new Map<string, ImportLookupBranch>(
      branches.map((branch) => [this.toLookupKey(branch.supplierName), branch]),
    );
    const productServiceLookup = new Map<string, ImportLookupProductService>(
      productServices.map((productService) => [
        this.toLookupKey(productService.name),
        productService,
      ]),
    );

    const previewRows = rows.map((row, index) =>
      this.toImportPreviewRow(
        row,
        index + 2,
        branchLookup,
        productServiceLookup,
      ),
    );
    const validRows = previewRows.filter((row) => row.isValid).length;

    return {
      mode: 'preview',
      summary: {
        totalRows: previewRows.length,
        validRows,
        invalidRows: previewRows.length - validRows,
        importedRows: 0,
      },
      rows: previewRows,
    };
  }

  private toImportPreviewRow(
    row: Record<string, unknown>,
    rowNumber: number,
    branchLookup: Map<string, ImportLookupBranch>,
    productServiceLookup: Map<string, ImportLookupProductService>,
  ): LeadImportPreviewRow {
    const leadName = this.readCell(row, 'Lead Name');
    const customerName = this.readCell(row, 'Customer Name');
    const phone = this.readCell(row, 'Phone');
    const email = this.normalizeOptionalString(this.readCell(row, 'Email'));
    const location = this.readCell(row, 'Location');
    const branchNameInput = this.readCell(row, 'Branch');
    const source = this.readCell(row, 'Source');
    const interestedProductServiceName = this.readCell(
      row,
      'Interested Product/Service',
    );
    const statusValue = this.normalizeOptionalString(this.readCell(row, 'Status'));
    const note = this.normalizeOptionalString(this.readCell(row, 'Note'));
    const nextFollowUpDateInput = this.normalizeOptionalString(
      this.readCell(row, 'Next Follow Up Date'),
    );
    const errors: string[] = [];

    if (!leadName) {
      errors.push('Lead Name is required');
    }

    if (!customerName) {
      errors.push('Customer Name is required');
    }

    if (!phone) {
      errors.push('Phone is required');
    }

    if (!location) {
      errors.push('Location is required');
    }

    if (!branchNameInput) {
      errors.push('Branch is required');
    }

    if (!source) {
      errors.push('Source is required');
    }

    if (!interestedProductServiceName) {
      errors.push('Interested Product/Service is required');
    }

    if (email && !this.isEmail(email)) {
      errors.push('Email must be a valid email address');
    }

    const status =
      statusValue && this.isLeadStatus(statusValue)
        ? statusValue
        : LeadStatus.NEW;

    if (statusValue && !this.isLeadStatus(statusValue)) {
      errors.push('Status must be one of NEW, CONTACTED, FOLLOW_UP, DEMO_SCHEDULED, CONVERTED, or LOST');
    }

    let nextFollowUpDate: string | null = null;
    if (nextFollowUpDateInput) {
      const parsedDate = new Date(nextFollowUpDateInput);
      if (Number.isNaN(parsedDate.getTime())) {
        errors.push('Next Follow Up Date must be a valid date');
      } else {
        nextFollowUpDate = parsedDate.toISOString();
      }
    }

    const branch = branchNameInput
      ? branchLookup.get(this.toLookupKey(branchNameInput)) ?? null
      : null;
    if (branchNameInput && !branch) {
      errors.push('Branch must match an existing branch name');
    }

    const interestedProductService = interestedProductServiceName
      ? productServiceLookup.get(
          this.toLookupKey(interestedProductServiceName),
        ) ?? null
      : null;
    if (interestedProductServiceName && !interestedProductService) {
      errors.push(
        'Interested Product/Service must match an existing product or service name',
      );
    }

    return {
      rowNumber,
      leadName,
      customerName,
      phone,
      email,
      location,
      branch: branchNameInput,
      source,
      interestedProductService: interestedProductServiceName,
      status,
      note,
      nextFollowUpDate,
      branchId: branch?.id ?? null,
      branchName: branch?.supplierName ?? null,
      interestedProductServiceId: interestedProductService?.id ?? null,
      interestedProductServiceName: interestedProductService?.name ?? null,
      isValid: errors.length === 0,
      errors,
    };
  }

  private readCell(row: Record<string, unknown>, key: string): string {
    const value = row[key];
    return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  }

  private toLookupKey(value: string): string {
    return value.trim().toLowerCase();
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isLeadStatus(value: string): value is LeadStatus {
    return Object.values(LeadStatus).includes(value as LeadStatus);
  }
}
