import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ComplaintStatus,
  JobStatus,
  NotificationReferenceType,
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  createPaginationMeta,
  normalizePagination,
} from '../common/utils/pagination.util';
import { EmployeeTasksService } from '../employee-tasks/employee-tasks.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ListComplaintsQueryDto } from './dto/list-complaints-query.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';

const complaintSelect = Prisma.validator<Prisma.ComplaintSelect>()({
  id: true,
  customerId: true,
  customerName: true,
  contactPerson: true,
  phone: true,
  email: true,
  address: true,
  location: true,
  complaintTitle: true,
  complaintDescription: true,
  status: true,
  assignedEmployeeId: true,
  notes: true,
  jobId: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
    },
  },
  assignedEmployee: {
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      status: true,
    },
  },
  job: {
    select: {
      id: true,
      jobNumber: true,
      title: true,
      status: true,
      scheduledDate: true,
    },
  },
});

type ComplaintRecord = Prisma.ComplaintGetPayload<{
  select: typeof complaintSelect;
}>;

@Injectable()
export class ComplaintsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly employeeTasksService: EmployeeTasksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listComplaints(
    query: ListComplaintsQueryDto,
    currentUser: JwtPayload,
  ) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();
    const dateRange = this.buildCreatedAtRange(query.fromDate, query.toDate);
    const where: Prisma.ComplaintWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.assignedEmployeeId
        ? { assignedEmployeeId: query.assignedEmployeeId }
        : {}),
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(search
        ? {
            OR: [
              {
                customerName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                complaintTitle: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                complaintDescription: {
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
          }
        : {}),
      ...(currentUser.role === Role.EMPLOYEE
        ? {
            OR: [
              { assignedEmployeeId: currentUser.sub },
              { assignedEmployeeId: null },
            ],
          }
        : {}),
    };

    const [total, complaints] = await Promise.all([
      this.prismaService.complaint.count({ where }),
      this.prismaService.complaint.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { complaintTitle: 'asc' }],
        skip,
        take: limit,
        select: complaintSelect,
      }),
    ]);

    return {
      data: complaints,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getComplaintById(
    complaintId: string,
    currentUser: JwtPayload,
  ): Promise<ComplaintRecord> {
    const complaint = await this.getComplaintOrThrow(complaintId);
    this.ensureComplaintReadable(complaint, currentUser);
    return complaint;
  }

  async createComplaint(
    createComplaintDto: CreateComplaintDto,
    currentUser: JwtPayload,
  ): Promise<ComplaintRecord> {
    this.ensureAssignmentAllowed(
      currentUser,
      createComplaintDto.assignedEmployeeId,
    );

    if (createComplaintDto.customerId) {
      await this.ensureCustomerExists(createComplaintDto.customerId);
    }

    const assignedEmployeeId = this.normalizeOptionalString(
      createComplaintDto.assignedEmployeeId,
    );
    if (assignedEmployeeId) {
      await this.ensureAssignableEmployeeExists(assignedEmployeeId);
    }

    const complaint = await this.prismaService.complaint.create({
      data: {
        customerId: this.normalizeOptionalString(createComplaintDto.customerId),
        customerName: createComplaintDto.customerName.trim(),
        contactPerson: createComplaintDto.contactPerson,
        phone: createComplaintDto.phone.trim(),
        email: this.normalizeOptionalString(createComplaintDto.email),
        address: createComplaintDto.address.trim(),
        location: createComplaintDto.location.trim(),
        complaintTitle: createComplaintDto.complaintTitle.trim(),
        complaintDescription: createComplaintDto.complaintDescription.trim(),
        status:
          assignedEmployeeId && !createComplaintDto.status
            ? ComplaintStatus.ASSIGNED
            : createComplaintDto.status ?? ComplaintStatus.PENDING,
        assignedEmployeeId,
        notes: this.normalizeOptionalString(createComplaintDto.notes),
      },
      select: {
        id: true,
      },
    });

    const createdComplaint = await this.getComplaintOrThrow(complaint.id);
    await this.employeeTasksService.syncComplaintTask(createdComplaint.id);
    await this.notificationsService.notifyAdminUsers({
      title: 'Complaint created',
      message: `${createdComplaint.customerName} reported "${createdComplaint.complaintTitle}".`,
      referenceType: NotificationReferenceType.COMPLAINT,
      referenceId: createdComplaint.id,
    });

    if (assignedEmployeeId) {
      await this.notificationsService.notifyUsers([assignedEmployeeId], {
        title: 'Complaint assigned',
        message: `${createdComplaint.complaintTitle} was assigned to you.`,
        referenceType: NotificationReferenceType.COMPLAINT,
        referenceId: createdComplaint.id,
      });
    }

    return createdComplaint;
  }

  async updateComplaint(
    complaintId: string,
    updateComplaintDto: UpdateComplaintDto,
    currentUser: JwtPayload,
  ): Promise<ComplaintRecord> {
    const existingComplaint = await this.getComplaintOrThrow(complaintId);
    this.ensureComplaintReadable(existingComplaint, currentUser);
    this.ensureAssignmentAllowed(
      currentUser,
      updateComplaintDto.assignedEmployeeId,
    );

    if (
      currentUser.role === Role.EMPLOYEE &&
      updateComplaintDto.status === ComplaintStatus.CONVERTED_TO_JOB
    ) {
      throw new ForbiddenException('Employees cannot convert complaints to jobs');
    }

    if (updateComplaintDto.customerId) {
      await this.ensureCustomerExists(updateComplaintDto.customerId);
    }

    const assignedEmployeeId =
      updateComplaintDto.assignedEmployeeId !== undefined
        ? this.normalizeOptionalString(updateComplaintDto.assignedEmployeeId)
        : existingComplaint.assignedEmployeeId;

    if (assignedEmployeeId) {
      await this.ensureAssignableEmployeeExists(assignedEmployeeId);
    }

    const updatedComplaint = await this.prismaService.complaint.update({
      where: {
        id: complaintId,
      },
      data: {
        ...(updateComplaintDto.customerId !== undefined
          ? {
              customerId: this.normalizeOptionalString(updateComplaintDto.customerId),
            }
          : {}),
        ...(updateComplaintDto.customerName !== undefined
          ? {
              customerName: updateComplaintDto.customerName.trim(),
            }
          : {}),
        ...(updateComplaintDto.contactPerson !== undefined
          ? {
              contactPerson: updateComplaintDto.contactPerson,
            }
          : {}),
        ...(updateComplaintDto.phone !== undefined
          ? {
              phone: updateComplaintDto.phone.trim(),
            }
          : {}),
        ...(updateComplaintDto.email !== undefined
          ? {
              email: this.normalizeOptionalString(updateComplaintDto.email),
            }
          : {}),
        ...(updateComplaintDto.address !== undefined
          ? {
              address: updateComplaintDto.address.trim(),
            }
          : {}),
        ...(updateComplaintDto.location !== undefined
          ? {
              location: updateComplaintDto.location.trim(),
            }
          : {}),
        ...(updateComplaintDto.complaintTitle !== undefined
          ? {
              complaintTitle: updateComplaintDto.complaintTitle.trim(),
            }
          : {}),
        ...(updateComplaintDto.complaintDescription !== undefined
          ? {
              complaintDescription: updateComplaintDto.complaintDescription.trim(),
            }
          : {}),
        ...(updateComplaintDto.status !== undefined
          ? {
              status: updateComplaintDto.status,
            }
          : {}),
        ...(updateComplaintDto.assignedEmployeeId !== undefined
          ? {
              assignedEmployeeId,
            }
          : {}),
        ...(updateComplaintDto.notes !== undefined
          ? {
              notes: this.normalizeOptionalString(updateComplaintDto.notes),
            }
          : {}),
      },
      select: complaintSelect,
    });

    await this.employeeTasksService.syncComplaintTask(updatedComplaint.id);

    if (
      assignedEmployeeId &&
      assignedEmployeeId !== existingComplaint.assignedEmployeeId
    ) {
      await this.notificationsService.notifyUsers([assignedEmployeeId], {
        title: 'Complaint assigned',
        message: `${updatedComplaint.complaintTitle} was assigned to you.`,
        referenceType: NotificationReferenceType.COMPLAINT,
        referenceId: updatedComplaint.id,
      });
    }

    return updatedComplaint;
  }

  async deleteComplaint(complaintId: string): Promise<ComplaintRecord> {
    const complaint = await this.getComplaintOrThrow(complaintId);

    return this.prismaService.complaint.delete({
      where: {
        id: complaintId,
      },
      select: complaintSelect,
    });
  }

  async convertToCustomer(complaintId: string): Promise<ComplaintRecord> {
    const complaint = await this.getComplaintOrThrow(complaintId);
    if (complaint.customerId) {
      return complaint;
    }

    const customer = await this.prismaService.customer.create({
      data: {
        name: complaint.customerName,
        phone: complaint.phone,
        email: complaint.email,
        address: complaint.address,
        billingAddress: complaint.address,
        shippingAddress: complaint.address,
        placeOfSupply: complaint.location,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    return this.prismaService.complaint.update({
      where: {
        id: complaintId,
      },
      data: {
        customerId: customer.id,
      },
      select: complaintSelect,
    });
  }

  async convertToJob(complaintId: string): Promise<ComplaintRecord> {
    const complaint = await this.getComplaintOrThrow(complaintId);

    if (complaint.jobId || complaint.status === ComplaintStatus.CONVERTED_TO_JOB) {
      throw new BadRequestException('Complaint is already converted to a job');
    }

    const updatedComplaint = await this.prismaService.$transaction(
      async (transaction) => {
        const ensuredComplaint = complaint.customerId
          ? complaint
          : await this.convertComplaintToCustomerInTransaction(
              transaction,
              complaint,
            );

        const jobCount = await transaction.job.count();
        const job = await transaction.job.create({
          data: {
            jobNumber: this.buildJobNumber(jobCount + 1),
            title: ensuredComplaint.complaintTitle,
            description: this.buildJobDescription(ensuredComplaint),
            customerId: ensuredComplaint.customerId!,
            status: JobStatus.PENDING,
            scheduledDate: this.startOfDay(new Date()),
          },
          select: {
            id: true,
          },
        });

        return transaction.complaint.update({
          where: {
            id: complaintId,
          },
          data: {
            jobId: job.id,
            status: ComplaintStatus.CONVERTED_TO_JOB,
          },
          select: complaintSelect,
        });
      },
    );

    await this.employeeTasksService.syncComplaintTask(updatedComplaint.id);
    if (updatedComplaint.jobId) {
      await this.employeeTasksService.syncJobTask(updatedComplaint.jobId);
    }

    const notificationUsers = [
      updatedComplaint.assignedEmployeeId,
    ].filter((value): value is string => Boolean(value));

    await this.notificationsService.notifyAdminUsers({
      title: 'Complaint converted to job',
      message: `${updatedComplaint.complaintTitle} is now linked to a service job.`,
      referenceType: NotificationReferenceType.COMPLAINT,
      referenceId: updatedComplaint.id,
    });
    await this.notificationsService.notifyUsers(notificationUsers, {
      title: 'Complaint converted to job',
      message: `${updatedComplaint.complaintTitle} is now linked to a service job.`,
      referenceType: NotificationReferenceType.COMPLAINT,
      referenceId: updatedComplaint.id,
    });

    return updatedComplaint;
  }

  private async convertComplaintToCustomerInTransaction(
    transaction: Prisma.TransactionClient,
    complaint: ComplaintRecord,
  ): Promise<ComplaintRecord> {
    const customer = await transaction.customer.create({
      data: {
        name: complaint.customerName,
        phone: complaint.phone,
        email: complaint.email,
        address: complaint.address,
        billingAddress: complaint.address,
        shippingAddress: complaint.address,
        placeOfSupply: complaint.location,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    return transaction.complaint.update({
      where: {
        id: complaint.id,
      },
      data: {
        customerId: customer.id,
      },
      select: complaintSelect,
    });
  }

  private async getComplaintOrThrow(
    complaintId: string,
  ): Promise<ComplaintRecord> {
    const complaint = await this.prismaService.complaint.findUnique({
      where: {
        id: complaintId,
      },
      select: complaintSelect,
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    return complaint;
  }

  private ensureComplaintReadable(
    complaint: ComplaintRecord,
    currentUser: JwtPayload,
  ): void {
    if (
      currentUser.role === Role.EMPLOYEE &&
      complaint.assignedEmployeeId &&
      complaint.assignedEmployeeId !== currentUser.sub
    ) {
      throw new ForbiddenException('Complaint not found');
    }
  }

  private ensureAssignmentAllowed(
    currentUser: JwtPayload,
    assignedEmployeeId: string | null | undefined,
  ): void {
    if (assignedEmployeeId === undefined) {
      return;
    }

    if (
      currentUser.role !== Role.ADMIN &&
      currentUser.role !== Role.ADMIN_OWNER
    ) {
      throw new ForbiddenException('Only admins can assign complaints');
    }
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const customer = await this.prismaService.customer.findUnique({
      where: {
        id: customerId,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
  }

  private async ensureAssignableEmployeeExists(
    employeeId: string,
  ): Promise<void> {
    const employee = await this.prismaService.user.findUnique({
      where: {
        id: employeeId,
      },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Assigned employee not found');
    }

    if (employee.role !== Role.ADMIN && employee.role !== Role.EMPLOYEE) {
      throw new BadRequestException(
        'Assigned complaint employee must be an admin or employee',
      );
    }

    if (employee.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Assigned complaint employee must be active');
    }
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
      range.gte = new Date(fromDate);
    }
    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      range.lte = endDate;
    }

    return range;
  }

  private buildJobNumber(sequence: number): string {
    const year = new Date().getFullYear();
    return `JOB-${year}-${String(sequence).padStart(3, '0')}`;
  }

  private buildJobDescription(complaint: ComplaintRecord): string {
    return [complaint.complaintDescription, complaint.notes]
      .filter((value): value is string => Boolean(value?.trim()))
      .join('\n\n');
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private normalizeOptionalString(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
