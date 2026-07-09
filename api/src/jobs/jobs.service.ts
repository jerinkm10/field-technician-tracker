import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JobAssignmentRoleType,
  JobAssignmentStatus,
  JobPriority,
  JobStatus,
  NotificationReferenceType,
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EmployeeTasksService } from '../employee-tasks/employee-tasks.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminJobDto } from './dto/create-admin-job.dto';
import { ListAdminJobsQueryDto } from './dto/list-admin-jobs-query.dto';
import { UpdateAdminJobDto } from './dto/update-admin-job.dto';

const assignmentSelect = Prisma.validator<Prisma.JobAssignmentSelect>()({
  id: true,
  userId: true,
  roleType: true,
  status: true,
  assignedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      technician: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  },
});

const jobSelect = Prisma.validator<Prisma.JobSelect>()({
  id: true,
  jobNumber: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  branchId: true,
  productServiceId: true,
  scheduledDate: true,
  startedAt: true,
  completedAt: true,
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      latitude: true,
      longitude: true,
    },
  },
  branch: {
    select: {
      id: true,
      supplierName: true,
      phone: true,
      email: true,
      gstin: true,
      address: true,
      bankName: true,
      accountNumber: true,
      ifscCode: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  technician: {
    select: {
      id: true,
      phone: true,
      status: true,
      currentLatitude: true,
      currentLongitude: true,
      lastSeenAt: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
        },
      },
    },
  },
  assignments: {
    orderBy: [{ roleType: 'asc' }, { assignedAt: 'asc' }],
    select: assignmentSelect,
  },
  productService: {
    select: {
      id: true,
      name: true,
      type: true,
      hsnSacCode: true,
    },
  },
  visits: {
    orderBy: {
      checkInAt: 'desc',
    },
    select: {
      id: true,
      technicianId: true,
      checkInAt: true,
      checkOutAt: true,
      timeSpentMinutes: true,
      startLatitude: true,
      startLongitude: true,
      endLatitude: true,
      endLongitude: true,
    },
  },
  attachments: {
    select: {
      id: true,
      type: true,
      fileUrl: true,
      createdAt: true,
    },
  },
});

type JobDetails = Prisma.JobGetPayload<{
  select: typeof jobSelect;
}>;

type TechnicianContext = {
  id: string;
  currentLatitude: number | null;
  currentLongitude: number | null;
};

type ResolvedAssignment = {
  userId: string;
  roleType: JobAssignmentRoleType;
  status: JobAssignmentStatus;
  technicianId: string | null;
};

type ResolvedAssignmentsResult = {
  assignments: ResolvedAssignment[];
  primaryTechnicianId: string | null;
};

@Injectable()
export class JobsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly employeeTasksService: EmployeeTasksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listTechnicianJobs(userId: string): Promise<JobDetails[]> {
    const visibleWindow = this.getTechnicianVisibilityWindow(new Date());

    if (!visibleWindow) {
      return [];
    }

    return this.prismaService.job.findMany({
      where: {
        scheduledDate: {
          gte: visibleWindow.start,
          lt: visibleWindow.end,
        },
        OR: [
          {
            assignments: {
              some: {
                userId,
                roleType: JobAssignmentRoleType.TECHNICIAN,
              },
            },
          },
          {
            technician: {
              is: {
                userId,
              },
            },
          },
        ],
      },
      orderBy: [{ scheduledDate: 'asc' }, { jobNumber: 'asc' }],
      select: jobSelect,
    });
  }

  async getJobById(jobId: string, currentUser: JwtPayload): Promise<JobDetails> {
    const job = await this.getJobDetailsOrThrow(jobId);

    if (
      currentUser.role === Role.TECHNICIAN &&
      !this.isTechnicianAssignedToJob(job, currentUser.sub)
    ) {
      throw new NotFoundException('Job not found');
    }

    if (
      currentUser.role === Role.TECHNICIAN &&
      !this.isTechnicianJobVisible(job.scheduledDate, new Date())
    ) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async listAdminJobs(query: ListAdminJobsQueryDto = {}): Promise<JobDetails[]> {
    return this.prismaService.job.findMany({
      where: this.buildAdminJobWhere(query),
      orderBy: [{ scheduledDate: 'asc' }, { jobNumber: 'asc' }],
      select: jobSelect,
    });
  }

  async createAdminJob(
    createAdminJobDto: CreateAdminJobDto,
  ): Promise<JobDetails> {
    const branchId = this.normalizeOptionalString(createAdminJobDto.branchId);
    const productServiceId = this.normalizeOptionalString(
      createAdminJobDto.productServiceId,
    );

    await this.ensureCustomerExists(createAdminJobDto.customerId);
    await this.ensureBranchExists(branchId);
    await this.ensureProductServiceExists(productServiceId);

    const resolvedAssignments = await this.resolveAssignments({
      technicianId: createAdminJobDto.technicianId,
      assignedMemberIds: createAdminJobDto.assignedMemberIds,
      nextJobStatus: createAdminJobDto.status,
    });

    const job = await this.prismaService.job.create({
      data: {
        jobNumber: createAdminJobDto.jobNumber.trim(),
        title: createAdminJobDto.title.trim(),
        description: createAdminJobDto.description.trim(),
        customerId: createAdminJobDto.customerId,
        branchId,
        technicianId: resolvedAssignments.primaryTechnicianId,
        productServiceId,
        priority: createAdminJobDto.priority ?? JobPriority.MEDIUM,
        status:
          createAdminJobDto.status ??
          (resolvedAssignments.assignments.length > 0
            ? JobStatus.ASSIGNED
            : JobStatus.PENDING),
        scheduledDate: new Date(createAdminJobDto.scheduledDate),
        assignments: resolvedAssignments.assignments.length
          ? {
              create: resolvedAssignments.assignments.map((assignment) => ({
                userId: assignment.userId,
                roleType: assignment.roleType,
                status: assignment.status,
              })),
            }
          : undefined,
      },
      select: jobSelect,
    });

    await this.employeeTasksService.syncJobTask(job.id);
    await this.notifyAssignedUsers(job, this.collectAssignedUserIds(job));

    return job;
  }

  async updateAdminJob(
    jobId: string,
    updateAdminJobDto: UpdateAdminJobDto,
  ): Promise<JobDetails> {
    const existingJob = await this.getJobDetailsOrThrow(jobId);

    if (updateAdminJobDto.customerId) {
      await this.ensureCustomerExists(updateAdminJobDto.customerId);
    }

    const hasBranchField = Object.prototype.hasOwnProperty.call(
      updateAdminJobDto,
      'branchId',
    );
    const branchId = hasBranchField
      ? this.normalizeOptionalString(updateAdminJobDto.branchId)
      : undefined;

    if (hasBranchField) {
      await this.ensureBranchExists(branchId);
    }

    const hasProductServiceField = Object.prototype.hasOwnProperty.call(
      updateAdminJobDto,
      'productServiceId',
    );
    const productServiceId = hasProductServiceField
      ? this.normalizeOptionalString(updateAdminJobDto.productServiceId)
      : undefined;

    if (hasProductServiceField) {
      await this.ensureProductServiceExists(productServiceId);
    }

    const hasTechnicianField = Object.prototype.hasOwnProperty.call(
      updateAdminJobDto,
      'technicianId',
    );
    const hasAssignedMemberField = Object.prototype.hasOwnProperty.call(
      updateAdminJobDto,
      'assignedMemberIds',
    );
    const hasAssignmentChanges = hasTechnicianField || hasAssignedMemberField;
    const nextJobStatus = updateAdminJobDto.status ?? existingJob.status;

    const resolvedAssignments = hasAssignmentChanges
      ? await this.resolveAssignments({
          technicianId: hasTechnicianField
            ? updateAdminJobDto.technicianId
            : undefined,
          assignedMemberIds: hasAssignedMemberField
            ? updateAdminJobDto.assignedMemberIds
            : undefined,
          nextJobStatus,
          existingAssignments: existingJob.assignments.map((assignment) => ({
            userId: assignment.userId,
            status: assignment.status,
            roleType: assignment.roleType,
          })),
        })
      : null;

    const previousAssignedUsers = new Set(this.collectAssignedUserIds(existingJob));

    const updatedJob = await this.prismaService.$transaction(async (transaction) => {
      await transaction.job.update({
        where: {
          id: jobId,
        },
        data: {
          jobNumber: updateAdminJobDto.jobNumber?.trim(),
          title: updateAdminJobDto.title?.trim(),
          description: updateAdminJobDto.description?.trim(),
          customerId: updateAdminJobDto.customerId,
          ...(hasBranchField
            ? {
                branchId,
              }
            : {}),
          ...(hasAssignmentChanges
            ? {
                technicianId: resolvedAssignments?.primaryTechnicianId ?? null,
              }
            : {}),
          ...(hasProductServiceField
            ? {
                productServiceId,
              }
            : {}),
          priority: updateAdminJobDto.priority,
          status: updateAdminJobDto.status,
          scheduledDate: updateAdminJobDto.scheduledDate
            ? new Date(updateAdminJobDto.scheduledDate)
            : undefined,
          ...(updateAdminJobDto.status === JobStatus.COMPLETED
            ? {
                completedAt: new Date(),
              }
            : updateAdminJobDto.status
              ? {
                  completedAt: null,
                }
              : {}),
        },
      });

      if (hasAssignmentChanges) {
        const nextAssignments = resolvedAssignments?.assignments ?? [];
        const nextUserIds = nextAssignments.map((assignment) => assignment.userId);

        if (nextUserIds.length > 0) {
          await transaction.jobAssignment.deleteMany({
            where: {
              jobId,
              userId: {
                notIn: nextUserIds,
              },
            },
          });
        } else {
          await transaction.jobAssignment.deleteMany({
            where: {
              jobId,
            },
          });
        }

        for (const assignment of nextAssignments) {
          await transaction.jobAssignment.upsert({
            where: {
              jobId_userId: {
                jobId,
                userId: assignment.userId,
              },
            },
            update: {
              roleType: assignment.roleType,
              status: assignment.status,
            },
            create: {
              jobId,
              userId: assignment.userId,
              roleType: assignment.roleType,
              status: assignment.status,
            },
          });
        }
      } else if (updateAdminJobDto.status === JobStatus.COMPLETED) {
        await transaction.jobAssignment.updateMany({
          where: {
            jobId,
          },
          data: {
            status: JobAssignmentStatus.COMPLETED,
          },
        });
      }

      return this.getJobDetailsById(transaction, jobId);
    });

    await this.employeeTasksService.syncJobTask(updatedJob.id);

    const newlyAssignedUserIds = this.collectAssignedUserIds(updatedJob).filter(
      (userId) => !previousAssignedUsers.has(userId),
    );

    if (newlyAssignedUserIds.length > 0) {
      await this.notifyAssignedUsers(updatedJob, newlyAssignedUserIds);
    }

    return updatedJob;
  }

  async deleteAdminJob(jobId: string): Promise<JobDetails> {
    await this.ensureJobExists(jobId);

    await this.prismaService.employeeTask.deleteMany({
      where: {
        referenceType: 'JOB',
        referenceId: jobId,
      },
    });

    return this.prismaService.job.delete({
      where: {
        id: jobId,
      },
      select: jobSelect,
    });
  }

  async startJob(jobId: string, userId: string): Promise<JobDetails> {
    const technician = await this.getTechnicianByUserId(userId);
    const { currentLatitude, currentLongitude } = technician;

    if (currentLatitude === null || currentLongitude === null) {
      throw new BadRequestException(
        'Technician current location is required to start a job',
      );
    }

    const job = await this.prismaService.$transaction(async (transaction) => {
      const snapshot = await transaction.job.findUnique({
        where: {
          id: jobId,
        },
        select: {
          id: true,
          scheduledDate: true,
          technicianId: true,
          status: true,
          startedAt: true,
          assignments: {
            where: {
              userId,
              roleType: JobAssignmentRoleType.TECHNICIAN,
            },
            select: {
              userId: true,
            },
          },
        },
      });

      if (
        !snapshot ||
        !this.isTechnicianAssignmentSnapshotVisible(snapshot, userId, technician.id)
      ) {
        throw new NotFoundException('Job not found');
      }

      if (!this.isTechnicianJobVisible(snapshot.scheduledDate, new Date())) {
        throw new BadRequestException(
          'Today\'s scheduled jobs become available to technicians at 09:00 AM.',
        );
      }

      if (
        snapshot.status === JobStatus.COMPLETED ||
        snapshot.status === JobStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Only pending, assigned, or started jobs can be started',
        );
      }

      const activeVisit = await transaction.jobVisit.findFirst({
        where: {
          jobId,
          technicianId: technician.id,
          checkOutAt: null,
        },
        select: {
          id: true,
        },
      });

      if (activeVisit) {
        throw new BadRequestException('An active job visit already exists');
      }

      const startedAt = new Date();

      await transaction.job.update({
        where: {
          id: jobId,
        },
        data: {
          status: JobStatus.STARTED,
          startedAt: snapshot.startedAt ?? startedAt,
        },
      });

      await transaction.jobVisit.create({
        data: {
          jobId,
          technicianId: technician.id,
          checkInAt: startedAt,
          startLatitude: currentLatitude,
          startLongitude: currentLongitude,
        },
      });

      await this.upsertTechnicianAssignment(
        transaction,
        jobId,
        userId,
        JobAssignmentStatus.IN_PROGRESS,
      );

      return this.getJobDetailsById(transaction, jobId);
    });

    await this.employeeTasksService.syncJobTask(job.id);

    return job;
  }

  async endJob(jobId: string, userId: string): Promise<JobDetails> {
    const technician = await this.getTechnicianByUserId(userId);

    const job = await this.prismaService.$transaction(async (transaction) => {
      const snapshot = await transaction.job.findUnique({
        where: {
          id: jobId,
        },
        select: {
          id: true,
          technicianId: true,
          status: true,
          assignments: {
            where: {
              roleType: JobAssignmentRoleType.TECHNICIAN,
            },
            select: {
              userId: true,
              status: true,
            },
          },
        },
      });

      if (
        !snapshot ||
        !this.isTechnicianAssignmentSnapshotVisible(snapshot, userId, technician.id)
      ) {
        throw new NotFoundException('Job not found');
      }

      if (snapshot.status !== JobStatus.STARTED) {
        throw new BadRequestException('Only started jobs can be ended');
      }

      const activeVisit = await transaction.jobVisit.findFirst({
        where: {
          jobId,
          technicianId: technician.id,
          checkOutAt: null,
        },
        orderBy: {
          checkInAt: 'desc',
        },
      });

      if (!activeVisit) {
        throw new BadRequestException('No active job visit found for this job');
      }

      const completedAt = new Date();
      const timeSpentMinutes = Math.max(
        0,
        Math.round(
          (completedAt.getTime() - activeVisit.checkInAt.getTime()) / 60000,
        ),
      );

      await transaction.jobVisit.update({
        where: {
          id: activeVisit.id,
        },
        data: {
          checkOutAt: completedAt,
          timeSpentMinutes,
          endLatitude: technician.currentLatitude,
          endLongitude: technician.currentLongitude,
        },
      });

      await this.upsertTechnicianAssignment(
        transaction,
        jobId,
        userId,
        JobAssignmentStatus.COMPLETED,
      );

      const remainingAssignments = await transaction.jobAssignment.count({
        where: {
          jobId,
          roleType: JobAssignmentRoleType.TECHNICIAN,
          status: {
            not: JobAssignmentStatus.COMPLETED,
          },
        },
      });

      await transaction.job.update({
        where: {
          id: jobId,
        },
        data: {
          status: remainingAssignments > 0 ? JobStatus.STARTED : JobStatus.COMPLETED,
          completedAt: remainingAssignments > 0 ? null : completedAt,
        },
      });

      return this.getJobDetailsById(transaction, jobId);
    });

    await this.employeeTasksService.syncJobTask(job.id);

    if (job.status === JobStatus.COMPLETED) {
      await this.notifyJobCompleted(job);
    }

    return job;
  }

  private buildAdminJobWhere(
    query: ListAdminJobsQueryDto,
  ): Prisma.JobWhereInput {
    const search = query.search?.trim();
    const scheduledDate = this.buildDateRange(query.fromDate, query.toDate);

    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assignedUserId
        ? {
            assignments: {
              some: {
                userId: query.assignedUserId,
              },
            },
          }
        : {}),
      ...(scheduledDate ? { scheduledDate } : {}),
      ...(search
        ? {
            OR: [
              {
                jobNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                title: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                customer: {
                  is: {
                    name: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                branch: {
                  is: {
                    supplierName: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                assignments: {
                  some: {
                    user: {
                      OR: [
                        {
                          name: {
                            contains: search,
                            mode: 'insensitive',
                          },
                        },
                        {
                          username: {
                            contains: search,
                            mode: 'insensitive',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
  }

  private buildDateRange(
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

  private async resolveAssignments(params: {
    technicianId?: string | null;
    assignedMemberIds?: string[] | null;
    nextJobStatus?: JobStatus;
    existingAssignments?: Array<{
      userId: string;
      roleType: JobAssignmentRoleType;
      status: JobAssignmentStatus;
    }>;
  }): Promise<ResolvedAssignmentsResult> {
    const assignmentUserIds = this.normalizeAssignedUserIds(params.assignedMemberIds);
    const legacyTechnicianId = this.normalizeOptionalString(params.technicianId);
    let legacyTechnicianUserId: string | null = null;
    let primaryTechnicianId: string | null = null;

    if (legacyTechnicianId) {
      const technician = await this.prismaService.technician.findUnique({
        where: {
          id: legacyTechnicianId,
        },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!technician) {
        throw new NotFoundException('Technician not found');
      }

      legacyTechnicianUserId = technician.userId;
      primaryTechnicianId = technician.id;
    }

    const combinedUserIds = legacyTechnicianUserId
      ? Array.from(new Set([legacyTechnicianUserId, ...assignmentUserIds]))
      : assignmentUserIds;

    if (combinedUserIds.length === 0) {
      return {
        assignments: [],
        primaryTechnicianId: null,
      };
    }

    const users = await this.prismaService.user.findMany({
      where: {
        id: {
          in: combinedUserIds,
        },
      },
      select: {
        id: true,
        role: true,
        status: true,
        technician: {
          select: {
            id: true,
          },
        },
      },
    });

    const usersById = new Map(users.map((user) => [user.id, user]));
    const existingAssignmentsByUserId = new Map(
      (params.existingAssignments ?? []).map((assignment) => [
        assignment.userId,
        assignment,
      ]),
    );

    const assignments = combinedUserIds.map((userId) => {
      const user = usersById.get(userId);

      if (!user) {
        throw new NotFoundException('Assigned member not found');
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new BadRequestException('Assigned members must be active users');
      }

      if (user.role !== Role.TECHNICIAN && user.role !== Role.EMPLOYEE) {
        throw new BadRequestException(
          'Only technician and employee users can be assigned to jobs',
        );
      }

      if (user.role === Role.TECHNICIAN && !user.technician?.id) {
        throw new BadRequestException(
          'Assigned technician is missing a technician profile',
        );
      }

      if (!primaryTechnicianId && user.role === Role.TECHNICIAN) {
        primaryTechnicianId = user.technician?.id ?? null;
      }

      return {
        userId: user.id,
        roleType:
          user.role === Role.TECHNICIAN
            ? JobAssignmentRoleType.TECHNICIAN
            : JobAssignmentRoleType.EMPLOYEE,
        status: this.resolveAssignmentStatus(
          params.nextJobStatus,
          existingAssignmentsByUserId.get(user.id)?.status,
        ),
        technicianId: user.technician?.id ?? null,
      };
    });

    return {
      assignments,
      primaryTechnicianId,
    };
  }

  private resolveAssignmentStatus(
    nextJobStatus?: JobStatus,
    currentStatus?: JobAssignmentStatus,
  ): JobAssignmentStatus {
    if (nextJobStatus === JobStatus.COMPLETED) {
      return JobAssignmentStatus.COMPLETED;
    }

    if (currentStatus === JobAssignmentStatus.COMPLETED) {
      return JobAssignmentStatus.COMPLETED;
    }

    if (currentStatus === JobAssignmentStatus.IN_PROGRESS) {
      return JobAssignmentStatus.IN_PROGRESS;
    }

    if (currentStatus === JobAssignmentStatus.ACCEPTED) {
      return JobAssignmentStatus.ACCEPTED;
    }

    return JobAssignmentStatus.ASSIGNED;
  }

  private normalizeAssignedUserIds(values?: string[] | null): string[] {
    return Array.from(
      new Set(
        (values ?? [])
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    );
  }

  private async ensureJobExists(jobId: string): Promise<void> {
    const job = await this.prismaService.job.findUnique({
      where: {
        id: jobId,
      },
      select: {
        id: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
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

  private async ensureBranchExists(branchId?: string | null): Promise<void> {
    if (!branchId) {
      return;
    }

    const branch = await this.prismaService.supplier.findUnique({
      where: {
        id: branchId,
      },
      select: {
        id: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  }

  private async ensureProductServiceExists(
    productServiceId?: string | null,
  ): Promise<void> {
    if (!productServiceId) {
      return;
    }

    const productService = await this.prismaService.productService.findUnique({
      where: {
        id: productServiceId,
      },
      select: {
        id: true,
      },
    });

    if (!productService) {
      throw new NotFoundException('Product or service not found');
    }
  }

  private async getTechnicianByUserId(
    userId: string,
  ): Promise<TechnicianContext> {
    const technician = await this.prismaService.technician.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        currentLatitude: true,
        currentLongitude: true,
      },
    });

    if (!technician) {
      throw new ForbiddenException('Technician profile not found');
    }

    return technician;
  }

  private async getJobDetailsOrThrow(jobId: string): Promise<JobDetails> {
    const job = await this.prismaService.job.findUnique({
      where: {
        id: jobId,
      },
      select: jobSelect,
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  private async getJobDetailsById(
    transaction: Prisma.TransactionClient,
    jobId: string,
  ): Promise<JobDetails> {
    const job = await transaction.job.findUnique({
      where: {
        id: jobId,
      },
      select: jobSelect,
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  private async upsertTechnicianAssignment(
    transaction: Prisma.TransactionClient,
    jobId: string,
    userId: string,
    status: JobAssignmentStatus,
  ): Promise<void> {
    await transaction.jobAssignment.upsert({
      where: {
        jobId_userId: {
          jobId,
          userId,
        },
      },
      update: {
        roleType: JobAssignmentRoleType.TECHNICIAN,
        status,
      },
      create: {
        jobId,
        userId,
        roleType: JobAssignmentRoleType.TECHNICIAN,
        status,
      },
    });
  }

  private isTechnicianAssignedToJob(job: JobDetails, userId: string): boolean {
    return (
      job.assignments.some(
        (assignment) =>
          assignment.userId === userId &&
          assignment.roleType === JobAssignmentRoleType.TECHNICIAN,
      ) || job.technician?.user.id === userId
    );
  }

  private isTechnicianAssignmentSnapshotVisible(
    job: {
      technicianId: string | null;
      assignments: Array<{ userId: string }>;
    },
    userId: string,
    technicianId: string,
  ): boolean {
    return (
      job.assignments.some((assignment) => assignment.userId === userId) ||
      job.technicianId === technicianId
    );
  }

  private collectAssignedUserIds(job: JobDetails): string[] {
    if (job.assignments.length > 0) {
      return job.assignments.map((assignment) => assignment.userId);
    }

    return job.technician?.user.id ? [job.technician.user.id] : [];
  }

  private async notifyAssignedUsers(
    job: JobDetails,
    userIds: string[],
  ): Promise<void> {
    for (const userId of userIds) {
      await this.notificationsService.createNotification({
        userId,
        title: 'Job assigned',
        message: `${job.jobNumber} is scheduled for ${this.formatDate(job.scheduledDate)}.`,
        referenceType: NotificationReferenceType.JOB,
        referenceId: job.id,
      });
    }
  }

  private async notifyJobCompleted(job: JobDetails): Promise<void> {
    for (const userId of this.collectAssignedUserIds(job)) {
      await this.notificationsService.createNotification({
        userId,
        title: 'Job completed',
        message: `${job.jobNumber} has been marked complete.`,
        referenceType: NotificationReferenceType.JOB,
        referenceId: job.id,
      });
    }
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private addDays(value: Date, days: number): Date {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return next;
  }

  private getTechnicianVisibilityWindow(
    now: Date,
  ): { start: Date; end: Date } | null {
    const today = this.startOfDay(now);
    const visibleAt = new Date(today);
    visibleAt.setHours(9, 0, 0, 0);

    if (now.getTime() < visibleAt.getTime()) {
      return null;
    }

    return {
      start: today,
      end: this.addDays(today, 1),
    };
  }

  private isTechnicianJobVisible(scheduledDate: Date, now: Date): boolean {
    const visibleWindow = this.getTechnicianVisibilityWindow(now);

    if (!visibleWindow) {
      return false;
    }

    return (
      scheduledDate.getTime() >= visibleWindow.start.getTime() &&
      scheduledDate.getTime() < visibleWindow.end.getTime()
    );
  }

  private formatDate(value: Date): string {
    return value.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private normalizeOptionalString(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
