import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JobStatus,
  NotificationReferenceType,
  Prisma,
  Role,
  TaskReferenceType,
} from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EmployeeTasksService } from '../employee-tasks/employee-tasks.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminJobDto } from './dto/create-admin-job.dto';
import { UpdateAdminJobDto } from './dto/update-admin-job.dto';

const jobSelect = Prisma.validator<Prisma.JobSelect>()({
  id: true,
  jobNumber: true,
  title: true,
  description: true,
  status: true,
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
          email: true,
          role: true,
        },
      },
    },
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

@Injectable()
export class JobsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly employeeTasksService: EmployeeTasksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listTechnicianJobs(userId: string): Promise<JobDetails[]> {
    const technician = await this.getTechnicianByUserId(userId);
    const visibleWindow = this.getTechnicianVisibilityWindow(new Date());

    if (!visibleWindow) {
      return [];
    }

    return this.prismaService.job.findMany({
      where: {
        technicianId: technician.id,
        scheduledDate: {
          gte: visibleWindow.start,
          lt: visibleWindow.end,
        },
      },
      orderBy: [{ scheduledDate: 'asc' }, { jobNumber: 'asc' }],
      select: jobSelect,
    });
  }

  async getJobById(jobId: string, currentUser: JwtPayload): Promise<JobDetails> {
    const job = await this.getJobDetailsOrThrow(jobId);

    if (
      currentUser.role === Role.TECHNICIAN &&
      job.technician?.user.id !== currentUser.sub
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

  async listAdminJobs(): Promise<JobDetails[]> {
    return this.prismaService.job.findMany({
      orderBy: [{ scheduledDate: 'asc' }, { jobNumber: 'asc' }],
      select: jobSelect,
    });
  }

  async createAdminJob(
    createAdminJobDto: CreateAdminJobDto,
  ): Promise<JobDetails> {
    const technicianId = this.normalizeOptionalString(
      createAdminJobDto.technicianId,
    );
    const productServiceId = this.normalizeOptionalString(
      createAdminJobDto.productServiceId,
    );

    await this.ensureCustomerAndTechnician(
      createAdminJobDto.customerId,
      technicianId,
    );
    await this.ensureProductServiceExists(productServiceId);

    const job = await this.prismaService.job.create({
      data: {
        jobNumber: createAdminJobDto.jobNumber,
        title: createAdminJobDto.title,
        description: createAdminJobDto.description,
        customerId: createAdminJobDto.customerId,
        technicianId,
        productServiceId,
        status:
          createAdminJobDto.status ??
          (technicianId ? JobStatus.ASSIGNED : JobStatus.PENDING),
        scheduledDate: new Date(createAdminJobDto.scheduledDate),
      },
      select: jobSelect,
    });

    await this.employeeTasksService.syncJobTask(job.id);
    await this.notifyAssignedTechnician(job);

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

    const hasTechnicianField = Object.prototype.hasOwnProperty.call(
      updateAdminJobDto,
      'technicianId',
    );
    const technicianId = hasTechnicianField
      ? this.normalizeOptionalString(updateAdminJobDto.technicianId)
      : undefined;
    if (technicianId) {
      await this.ensureTechnicianExists(technicianId);
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

    const updatedJob = await this.prismaService.job.update({
      where: {
        id: jobId,
      },
      data: {
        jobNumber: updateAdminJobDto.jobNumber,
        title: updateAdminJobDto.title,
        description: updateAdminJobDto.description,
        customerId: updateAdminJobDto.customerId,
        ...(hasTechnicianField
          ? {
              technicianId,
            }
          : {}),
        ...(hasProductServiceField
          ? {
              productServiceId,
            }
          : {}),
        status: updateAdminJobDto.status,
        scheduledDate: updateAdminJobDto.scheduledDate
          ? new Date(updateAdminJobDto.scheduledDate)
          : undefined,
      },
      select: jobSelect,
    });

    await this.employeeTasksService.syncJobTask(updatedJob.id);
    if (updatedJob.technician?.id !== existingJob.technician?.id) {
      await this.notifyAssignedTechnician(updatedJob);
    }

    return updatedJob;
  }

  async deleteAdminJob(jobId: string): Promise<JobDetails> {
    await this.ensureJobExists(jobId);

    await this.prismaService.employeeTask.deleteMany({
      where: {
        referenceType: TaskReferenceType.JOB,
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

    return this.prismaService.$transaction(async (transaction) => {
      const job = await transaction.job.findUnique({
        where: {
          id: jobId,
        },
        select: {
          id: true,
          scheduledDate: true,
          technicianId: true,
          status: true,
        },
      });

      if (!job || job.technicianId !== technician.id) {
        throw new NotFoundException('Job not found');
      }

      if (!this.isTechnicianJobVisible(job.scheduledDate, new Date())) {
        throw new BadRequestException(
          'Today\'s scheduled jobs become available to technicians at 09:00 AM.',
        );
      }

      if (job.status === JobStatus.STARTED) {
        throw new BadRequestException('Job is already started');
      }

      if (
        job.status === JobStatus.COMPLETED ||
        job.status === JobStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Only pending or assigned jobs can be started',
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
          startedAt,
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

      return this.getJobDetailsById(transaction, jobId);
    });
  }

  async endJob(jobId: string, userId: string): Promise<JobDetails> {
    const technician = await this.getTechnicianByUserId(userId);

    return this.prismaService.$transaction(async (transaction) => {
      const job = await transaction.job.findUnique({
        where: {
          id: jobId,
        },
        select: {
          id: true,
          technicianId: true,
          status: true,
        },
      });

      if (!job || job.technicianId !== technician.id) {
        throw new NotFoundException('Job not found');
      }

      if (job.status !== JobStatus.STARTED) {
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

      await transaction.job.update({
        where: {
          id: jobId,
        },
        data: {
          status: JobStatus.COMPLETED,
          completedAt,
        },
      });

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

      return this.getJobDetailsById(transaction, jobId);
    });
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

  private async ensureCustomerAndTechnician(
    customerId: string,
    technicianId?: string | null,
  ): Promise<void> {
    await this.ensureCustomerExists(customerId);

    if (technicianId) {
      await this.ensureTechnicianExists(technicianId);
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

  private async ensureTechnicianExists(technicianId: string): Promise<void> {
    const technician = await this.prismaService.technician.findUnique({
      where: {
        id: technicianId,
      },
      select: {
        id: true,
      },
    });

    if (!technician) {
      throw new NotFoundException('Technician not found');
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

  private async notifyAssignedTechnician(job: JobDetails): Promise<void> {
    const userId = job.technician?.user.id;
    if (!userId) {
      return;
    }

    await this.notificationsService.createNotification({
      userId,
      title: 'Job assigned',
      message: `${job.jobNumber} is scheduled for ${this.formatDate(job.scheduledDate)}.`,
      referenceType: NotificationReferenceType.JOB,
      referenceId: job.id,
    });
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
