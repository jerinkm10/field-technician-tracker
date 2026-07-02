import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AmcStatus,
  ComplaintStatus,
  JobStatus,
  LeadStatus,
  NotificationReferenceType,
  OutstandingStatus,
  Prisma,
  Role,
  TaskPriority,
  TaskReferenceType,
  TaskStatus,
  UserStatus,
} from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  createPaginationMeta,
  normalizePagination,
} from '../common/utils/pagination.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListEmployeeTasksQueryDto } from './dto/list-employee-tasks-query.dto';
import { UpdateEmployeeTaskDto } from './dto/update-employee-task.dto';

const employeeTaskSelect = Prisma.validator<Prisma.EmployeeTaskSelect>()({
  id: true,
  title: true,
  priority: true,
  dueDate: true,
  customerId: true,
  assignedEmployeeId: true,
  referenceType: true,
  referenceId: true,
  status: true,
  sourceSnapshot: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
    },
  },
  assignedEmployee: {
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      status: true,
    },
  },
});

type EmployeeTaskRecord = Prisma.EmployeeTaskGetPayload<{
  select: typeof employeeTaskSelect;
}>;

type TaskUpsertInput = {
  assignedEmployeeId: string;
  customerId?: string | null;
  dueDate: Date;
  priority: TaskPriority;
  referenceId: string;
  referenceType: TaskReferenceType;
  sourceSnapshot: Prisma.InputJsonValue;
  status: TaskStatus;
  title: string;
};

const SHARED_TASK_ROLES: Role[] = [
  Role.ADMIN_OWNER,
  Role.ADMIN,
  Role.EMPLOYEE,
];

@Injectable()
export class EmployeeTasksService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listTasks(
    currentUser: JwtPayload,
    query: ListEmployeeTasksQueryDto,
  ) {
    await this.refreshSharedTasks();

    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();
    const where = this.buildTaskWhere(currentUser, query, search);

    const [total, tasks] = await Promise.all([
      this.prismaService.employeeTask.count({ where }),
      this.prismaService.employeeTask.findMany({
        where,
        orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
        select: employeeTaskSelect,
      }),
    ]);

    return {
      data: tasks,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getTaskSummary(currentUser: JwtPayload) {
    await this.refreshSharedTasks();

    const today = this.startOfDay(new Date());
    const tomorrow = this.addDays(today, 1);
    const where = this.buildScopedTaskWhere(currentUser);

    const [todayTasks, overdueTasks, completedTasks, pendingTasks, recentTasks] =
      await Promise.all([
        this.prismaService.employeeTask.count({
          where: {
            ...where,
            dueDate: {
              gte: today,
              lt: tomorrow,
            },
            status: {
              in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.OVERDUE],
            },
          },
        }),
        this.prismaService.employeeTask.count({
          where: {
            ...where,
            status: TaskStatus.OVERDUE,
          },
        }),
        this.prismaService.employeeTask.count({
          where: {
            ...where,
            status: TaskStatus.COMPLETED,
          },
        }),
        this.prismaService.employeeTask.count({
          where: {
            ...where,
            status: {
              in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.OVERDUE],
            },
          },
        }),
        this.prismaService.employeeTask.findMany({
          where,
          orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
          take: 8,
          select: employeeTaskSelect,
        }),
      ]);

    return {
      todayTasks,
      overdueTasks,
      completedTasks,
      pendingTasks,
      recentTasks,
    };
  }

  async updateTaskStatus(
    taskId: string,
    updateEmployeeTaskDto: UpdateEmployeeTaskDto,
    currentUser: JwtPayload,
  ): Promise<EmployeeTaskRecord> {
    const task = await this.getTaskOrThrow(taskId);

    if (
      currentUser.role !== Role.ADMIN &&
      currentUser.role !== Role.ADMIN_OWNER &&
      task.assignedEmployeeId !== currentUser.sub
    ) {
      throw new ForbiddenException('Task not found');
    }

    return this.prismaService.employeeTask.update({
      where: {
        id: taskId,
      },
      data: {
        status: updateEmployeeTaskDto.status,
      },
      select: employeeTaskSelect,
    });
  }

  async syncLeadTask(leadId: string): Promise<void> {
    const lead = await this.prismaService.lead.findUnique({
      where: {
        id: leadId,
      },
      select: {
        id: true,
        leadName: true,
        customerName: true,
        assignedToEmployeeId: true,
        nextFollowUpDate: true,
        status: true,
      },
    });

    if (!lead) {
      return;
    }

    if (
      lead.status === LeadStatus.CONVERTED ||
      lead.status === LeadStatus.LOST
    ) {
      await this.markTasksCompleted(TaskReferenceType.LEAD, lead.id);
      return;
    }

    if (!lead.assignedToEmployeeId) {
      await this.prismaService.employeeTask.deleteMany({
        where: {
          referenceType: TaskReferenceType.LEAD,
          referenceId: lead.id,
        },
      });
      return;
    }

    const dueDate = lead.nextFollowUpDate ?? this.startOfDay(new Date());
    const status = this.deriveDateStatus(dueDate, true);
    await this.syncSingleOwnerTask({
      assignedEmployeeId: lead.assignedToEmployeeId,
      customerId: null,
      dueDate,
      priority: TaskPriority.HIGH,
      referenceType: TaskReferenceType.LEAD,
      referenceId: lead.id,
      sourceSnapshot: {
        leadName: lead.leadName,
        customerName: lead.customerName,
        module: 'lead',
      },
      status,
      title: `Lead follow-up: ${lead.leadName}`,
    });
  }

  async syncComplaintTask(complaintId: string): Promise<void> {
    const complaint = await this.prismaService.complaint.findUnique({
      where: {
        id: complaintId,
      },
      select: {
        id: true,
        customerId: true,
        customerName: true,
        complaintTitle: true,
        assignedEmployeeId: true,
        status: true,
        updatedAt: true,
      },
    });

    if (!complaint) {
      return;
    }

    if (
      complaint.status === ComplaintStatus.CONVERTED_TO_JOB ||
      complaint.status === ComplaintStatus.CLOSED ||
      complaint.status === ComplaintStatus.CANCELLED
    ) {
      await this.markTasksCompleted(TaskReferenceType.COMPLAINT, complaint.id);
      return;
    }

    if (!complaint.assignedEmployeeId) {
      await this.prismaService.employeeTask.deleteMany({
        where: {
          referenceType: TaskReferenceType.COMPLAINT,
          referenceId: complaint.id,
        },
      });
      return;
    }

    const status =
      complaint.status === ComplaintStatus.IN_PROGRESS
        ? this.deriveDateStatus(complaint.updatedAt, true)
        : this.deriveDateStatus(complaint.updatedAt, false);

    await this.syncSingleOwnerTask({
      assignedEmployeeId: complaint.assignedEmployeeId,
      customerId: complaint.customerId,
      dueDate: complaint.updatedAt,
      priority: TaskPriority.HIGH,
      referenceType: TaskReferenceType.COMPLAINT,
      referenceId: complaint.id,
      sourceSnapshot: {
        complaintTitle: complaint.complaintTitle,
        customerName: complaint.customerName,
        module: 'complaint',
      },
      status,
      title: `Complaint follow-up: ${complaint.complaintTitle}`,
    });
  }

  async syncJobTask(jobId: string): Promise<void> {
    const job = await this.prismaService.job.findUnique({
      where: {
        id: jobId,
      },
      select: {
        id: true,
        jobNumber: true,
        title: true,
        customerId: true,
        scheduledDate: true,
        status: true,
        technician: {
          select: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      return;
    }

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.CANCELLED) {
      await this.markTasksCompleted(TaskReferenceType.JOB, job.id);
      return;
    }

    const assignedUserId = job.technician?.user.id ?? null;
    if (!assignedUserId) {
      await this.prismaService.employeeTask.deleteMany({
        where: {
          referenceType: TaskReferenceType.JOB,
          referenceId: job.id,
        },
      });
      return;
    }

    await this.syncSingleOwnerTask({
      assignedEmployeeId: assignedUserId,
      customerId: job.customerId,
      dueDate: job.scheduledDate,
      priority: TaskPriority.MEDIUM,
      referenceType: TaskReferenceType.JOB,
      referenceId: job.id,
      sourceSnapshot: {
        jobNumber: job.jobNumber,
        jobTitle: job.title,
        module: 'job',
      },
      status:
        job.status === JobStatus.STARTED
          ? this.deriveDateStatus(job.scheduledDate, true)
          : this.deriveDateStatus(job.scheduledDate, false),
      title: `Today's job: ${job.jobNumber}`,
    });
  }

  async refreshSharedTasks(): Promise<void> {
    await this.refreshOverdueTasks();
    await this.syncOutstandingTasks();
    await this.syncAmcRenewalTasks();
  }

  private async syncOutstandingTasks(): Promise<void> {
    const [users, outstandings, existingTasks] = await Promise.all([
      this.listSharedTaskUsers(),
      this.prismaService.outstanding.findMany({
        where: {
          outstandingAmount: {
            gt: 0,
          },
          status: {
            in: [
              OutstandingStatus.PENDING,
              OutstandingStatus.PARTIAL,
              OutstandingStatus.OVERDUE,
            ],
          },
        },
        select: {
          id: true,
          invoiceNumber: true,
          customerId: true,
          customerName: true,
          dueDate: true,
          paidAmount: true,
          outstandingAmount: true,
          status: true,
        },
      }),
      this.prismaService.employeeTask.findMany({
        where: {
          referenceType: TaskReferenceType.OUTSTANDING,
        },
        select: {
          id: true,
          assignedEmployeeId: true,
          referenceId: true,
        },
      }),
    ]);

    const activeUserIds = users.map((user) => user.id);
    const activeReferenceIds = outstandings.map((outstanding) => outstanding.id);

    if (activeUserIds.length === 0) {
      return;
    }

    if (activeReferenceIds.length > 0) {
      await this.prismaService.employeeTask.updateMany({
        where: {
          referenceType: TaskReferenceType.OUTSTANDING,
          assignedEmployeeId: {
            in: activeUserIds,
          },
          referenceId: {
            notIn: activeReferenceIds,
          },
          status: {
            not: TaskStatus.COMPLETED,
          },
        },
        data: {
          status: TaskStatus.COMPLETED,
        },
      });
    } else {
      await this.prismaService.employeeTask.updateMany({
        where: {
          referenceType: TaskReferenceType.OUTSTANDING,
          assignedEmployeeId: {
            in: activeUserIds,
          },
          status: {
            not: TaskStatus.COMPLETED,
          },
        },
        data: {
          status: TaskStatus.COMPLETED,
        },
      });
    }

    const existingKeys = new Set(
      existingTasks.map((task) =>
        this.buildSharedTaskKey(task.assignedEmployeeId, task.referenceId),
      ),
    );

    for (const outstanding of outstandings) {
      for (const user of users) {
        const key = this.buildSharedTaskKey(user.id, outstanding.id);
        await this.prismaService.employeeTask.upsert({
          where: {
            assignedEmployeeId_referenceType_referenceId: {
              assignedEmployeeId: user.id,
              referenceType: TaskReferenceType.OUTSTANDING,
              referenceId: outstanding.id,
            },
          },
          update: {
            title: `Outstanding follow-up: ${outstanding.invoiceNumber}`,
            dueDate: outstanding.dueDate,
            customerId: outstanding.customerId,
            priority:
              outstanding.status === OutstandingStatus.OVERDUE
                ? TaskPriority.HIGH
                : TaskPriority.MEDIUM,
            status: this.deriveDateStatus(
              outstanding.dueDate,
              outstanding.paidAmount > 0,
            ),
            sourceSnapshot: {
              invoiceNumber: outstanding.invoiceNumber,
              customerName: outstanding.customerName,
              outstandingAmount: outstanding.outstandingAmount,
              module: 'outstanding',
            },
          },
          create: {
            assignedEmployeeId: user.id,
            customerId: outstanding.customerId,
            dueDate: outstanding.dueDate,
            priority:
              outstanding.status === OutstandingStatus.OVERDUE
                ? TaskPriority.HIGH
                : TaskPriority.MEDIUM,
            referenceType: TaskReferenceType.OUTSTANDING,
            referenceId: outstanding.id,
            status: this.deriveDateStatus(
              outstanding.dueDate,
              outstanding.paidAmount > 0,
            ),
            sourceSnapshot: {
              invoiceNumber: outstanding.invoiceNumber,
              customerName: outstanding.customerName,
              outstandingAmount: outstanding.outstandingAmount,
              module: 'outstanding',
            },
            title: `Outstanding follow-up: ${outstanding.invoiceNumber}`,
          },
        });

        if (!existingKeys.has(key)) {
          await this.notifyTaskCreated(
            user.id,
            `Outstanding follow-up: ${outstanding.invoiceNumber}`,
            outstanding.id,
          );
          existingKeys.add(key);
        }
      }
    }
  }

  private async syncAmcRenewalTasks(): Promise<void> {
    const today = this.startOfDay(new Date());
    const nextThirtyDays = this.addDays(today, 30);

    const [users, amcs, existingTasks] = await Promise.all([
      this.listSharedTaskUsers(),
      this.prismaService.amc.findMany({
        where: {
          status: AmcStatus.ACTIVE,
          OR: [
            {
              nextBillingDate: {
                not: null,
                lte: nextThirtyDays,
              },
            },
            {
              endDate: {
                lte: nextThirtyDays,
              },
            },
          ],
        },
        select: {
          id: true,
          amcNumber: true,
          customerId: true,
          customerName: true,
          endDate: true,
          nextBillingDate: true,
        },
      }),
      this.prismaService.employeeTask.findMany({
        where: {
          referenceType: TaskReferenceType.AMC_RENEWAL,
        },
        select: {
          id: true,
          assignedEmployeeId: true,
          referenceId: true,
        },
      }),
    ]);

    const activeUserIds = users.map((user) => user.id);
    const activeReferenceIds = amcs.map((amc) => amc.id);

    if (activeUserIds.length === 0) {
      return;
    }

    if (activeReferenceIds.length > 0) {
      await this.prismaService.employeeTask.updateMany({
        where: {
          referenceType: TaskReferenceType.AMC_RENEWAL,
          assignedEmployeeId: {
            in: activeUserIds,
          },
          referenceId: {
            notIn: activeReferenceIds,
          },
          status: {
            not: TaskStatus.COMPLETED,
          },
        },
        data: {
          status: TaskStatus.COMPLETED,
        },
      });
    } else {
      await this.prismaService.employeeTask.updateMany({
        where: {
          referenceType: TaskReferenceType.AMC_RENEWAL,
          assignedEmployeeId: {
            in: activeUserIds,
          },
          status: {
            not: TaskStatus.COMPLETED,
          },
        },
        data: {
          status: TaskStatus.COMPLETED,
        },
      });
    }

    const existingKeys = new Set(
      existingTasks.map((task) =>
        this.buildSharedTaskKey(task.assignedEmployeeId, task.referenceId),
      ),
    );

    for (const amc of amcs) {
      const dueDate = amc.nextBillingDate ?? amc.endDate;

      for (const user of users) {
        const key = this.buildSharedTaskKey(user.id, amc.id);
        await this.prismaService.employeeTask.upsert({
          where: {
            assignedEmployeeId_referenceType_referenceId: {
              assignedEmployeeId: user.id,
              referenceType: TaskReferenceType.AMC_RENEWAL,
              referenceId: amc.id,
            },
          },
          update: {
            title: `AMC renewal: ${amc.amcNumber}`,
            dueDate,
            customerId: amc.customerId,
            priority: TaskPriority.HIGH,
            status: this.deriveDateStatus(dueDate, false),
            sourceSnapshot: {
              amcNumber: amc.amcNumber,
              customerName: amc.customerName,
              nextBillingDate: amc.nextBillingDate,
              endDate: amc.endDate,
              module: 'amc',
            },
          },
          create: {
            assignedEmployeeId: user.id,
            customerId: amc.customerId,
            dueDate,
            priority: TaskPriority.HIGH,
            referenceType: TaskReferenceType.AMC_RENEWAL,
            referenceId: amc.id,
            status: this.deriveDateStatus(dueDate, false),
            sourceSnapshot: {
              amcNumber: amc.amcNumber,
              customerName: amc.customerName,
              nextBillingDate: amc.nextBillingDate,
              endDate: amc.endDate,
              module: 'amc',
            },
            title: `AMC renewal: ${amc.amcNumber}`,
          },
        });

        if (!existingKeys.has(key)) {
          await this.notifyTaskCreated(user.id, `AMC renewal: ${amc.amcNumber}`, amc.id);
          existingKeys.add(key);
        }
      }
    }
  }

  private async syncSingleOwnerTask(input: TaskUpsertInput): Promise<void> {
    await this.prismaService.employeeTask.deleteMany({
      where: {
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        assignedEmployeeId: {
          not: input.assignedEmployeeId,
        },
      },
    });

    const existingTask = await this.prismaService.employeeTask.findUnique({
      where: {
        assignedEmployeeId_referenceType_referenceId: {
          assignedEmployeeId: input.assignedEmployeeId,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
        },
      },
      select: {
        id: true,
      },
    });

    await this.prismaService.employeeTask.upsert({
      where: {
        assignedEmployeeId_referenceType_referenceId: {
          assignedEmployeeId: input.assignedEmployeeId,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
        },
      },
      update: {
        title: input.title,
        dueDate: input.dueDate,
        customerId: input.customerId,
        priority: input.priority,
        status: input.status,
        sourceSnapshot: input.sourceSnapshot,
      },
      create: {
        assignedEmployeeId: input.assignedEmployeeId,
        customerId: input.customerId,
        dueDate: input.dueDate,
        priority: input.priority,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        status: input.status,
        sourceSnapshot: input.sourceSnapshot,
        title: input.title,
      },
    });

    if (!existingTask) {
      await this.notifyTaskCreated(
        input.assignedEmployeeId,
        input.title,
        input.referenceId,
      );
    }
  }

  private async markTasksCompleted(
    referenceType: TaskReferenceType,
    referenceId: string,
  ): Promise<void> {
    await this.prismaService.employeeTask.updateMany({
      where: {
        referenceType,
        referenceId,
      },
      data: {
        status: TaskStatus.COMPLETED,
      },
    });
  }

  private async notifyTaskCreated(
    userId: string,
    title: string,
    referenceId: string,
  ): Promise<void> {
    await this.notificationsService.createNotification({
      userId,
      title: 'Task created',
      message: `${title} was added to your to-do list.`,
      referenceType: NotificationReferenceType.TASK,
      referenceId,
    });
  }

  private async listSharedTaskUsers(): Promise<Array<{ id: string }>> {
    return this.prismaService.user.findMany({
      where: {
        role: {
          in: SHARED_TASK_ROLES,
        },
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });
  }

  private async refreshOverdueTasks(): Promise<void> {
    const today = this.startOfDay(new Date());

    await this.prismaService.employeeTask.updateMany({
      where: {
        dueDate: {
          lt: today,
        },
        status: {
          in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS],
        },
      },
      data: {
        status: TaskStatus.OVERDUE,
      },
    });
  }

  private buildTaskWhere(
    currentUser: JwtPayload,
    query: ListEmployeeTasksQueryDto,
    search?: string,
  ): Prisma.EmployeeTaskWhereInput {
    const scopedWhere = this.buildScopedTaskWhere(
      currentUser,
      query.assignedEmployeeId,
    );
    const dateRange = this.buildDateRange(query);

    return {
      ...scopedWhere,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.referenceType ? { referenceType: query.referenceType } : {}),
      ...(dateRange ? { dueDate: dateRange } : {}),
      ...(search
        ? {
            OR: [
              {
                title: {
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
            ],
          }
        : {}),
    };
  }

  private buildScopedTaskWhere(
    currentUser: JwtPayload,
    assignedEmployeeId?: string,
  ): Prisma.EmployeeTaskWhereInput {
    if (
      currentUser.role === Role.ADMIN ||
      currentUser.role === Role.ADMIN_OWNER
    ) {
      return assignedEmployeeId ? { assignedEmployeeId } : {};
    }

    return {
      assignedEmployeeId: currentUser.sub,
    };
  }

  private buildDateRange(
    query: ListEmployeeTasksQueryDto,
  ): Prisma.DateTimeFilter | undefined {
    const today = this.startOfDay(new Date());

    if (query.todayOnly) {
      return {
        gte: today,
        lt: this.addDays(today, 1),
      };
    }

    if (!query.fromDate && !query.toDate) {
      return undefined;
    }

    const range: Prisma.DateTimeFilter = {};
    if (query.fromDate) {
      range.gte = new Date(query.fromDate);
    }
    if (query.toDate) {
      const endDate = new Date(query.toDate);
      endDate.setHours(23, 59, 59, 999);
      range.lte = endDate;
    }

    return range;
  }

  private async getTaskOrThrow(taskId: string): Promise<EmployeeTaskRecord> {
    const task = await this.prismaService.employeeTask.findUnique({
      where: {
        id: taskId,
      },
      select: employeeTaskSelect,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private deriveDateStatus(
    dueDate: Date,
    isInProgress: boolean,
  ): TaskStatus {
    if (this.startOfDay(dueDate) < this.startOfDay(new Date())) {
      return TaskStatus.OVERDUE;
    }

    return isInProgress ? TaskStatus.IN_PROGRESS : TaskStatus.PENDING;
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private addDays(value: Date, days: number): Date {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return next;
  }

  private buildSharedTaskKey(
    assignedEmployeeId: string,
    referenceId: string,
  ): string {
    return `${assignedEmployeeId}:${referenceId}`;
  }
}
