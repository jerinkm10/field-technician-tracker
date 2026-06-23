import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadStatus,
  Prisma,
} from '@prisma/client';
import {
  read,
  utils,
  write,
} from 'xlsx';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  createPaginationMeta,
  normalizePagination,
} from '../common/utils/pagination.util';
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

@Injectable()
export class LeadsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listLeads(query: ListLeadsQueryDto) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();
    const dateRange = this.buildCreatedAtRange(query.fromDate, query.toDate);
    const where: Prisma.LeadWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
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

  async getLeadById(leadId: string) {
    return this.getLeadDetailsOrThrow(leadId);
  }

  async createLead(
    createLeadDto: CreateLeadDto,
    currentUser: JwtPayload,
  ) {
    const branch = await this.getSupplierOrThrow(createLeadDto.branchId);
    const interestedProductService = await this.getProductServiceOrThrow(
      createLeadDto.interestedProductServiceId,
    );
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

    return this.getLeadDetailsOrThrow(lead.id);
  }

  async updateLead(
    leadId: string,
    updateLeadDto: UpdateLeadDto,
    currentUser: JwtPayload,
  ) {
    const existingLead = await this.getLeadDetailsOrThrow(leadId);
    const branch = updateLeadDto.branchId
      ? await this.getSupplierOrThrow(updateLeadDto.branchId)
      : null;
    const interestedProductService = updateLeadDto.interestedProductServiceId
      ? await this.getProductServiceOrThrow(
          updateLeadDto.interestedProductServiceId,
        )
      : null;
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

    return this.getLeadDetailsOrThrow(leadId);
  }

  async updateLeadStatus(
    leadId: string,
    updateLeadStatusDto: UpdateLeadStatusDto,
    currentUser: JwtPayload,
  ) {
    await this.getLeadDetailsOrThrow(leadId);

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

    return this.getLeadDetailsOrThrow(leadId);
  }

  async deleteLead(leadId: string) {
    await this.getLeadDetailsOrThrow(leadId);

    return this.prismaService.lead.delete({
      where: {
        id: leadId,
      },
      select: leadListSelect,
    });
  }

  async getLeadNotes(leadId: string): Promise<LeadNoteRecord[]> {
    await this.getLeadDetailsOrThrow(leadId);

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
    await this.getLeadDetailsOrThrow(leadId);

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

    await this.prismaService.$transaction(async (transaction) => {
      for (const row of validRows) {
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
            branchId: row.branchId!,
            branchName: row.branchName!,
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
