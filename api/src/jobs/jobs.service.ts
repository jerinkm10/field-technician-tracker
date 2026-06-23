import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus, Prisma, Role } from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminJobDto } from './dto/create-admin-job.dto';
import { UpdateAdminJobDto } from './dto/update-admin-job.dto';

const jobSelect = Prisma.validator<Prisma.JobSelect>()({
  id: true,
  jobNumber: true,
  title: true,
  description: true,
  status: true,
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
  constructor(private readonly prismaService: PrismaService) {}

  async listTechnicianJobs(userId: string): Promise<JobDetails[]> {
    const technician = await this.getTechnicianByUserId(userId);

    return this.prismaService.job.findMany({
      where: {
        technicianId: technician.id,
      },
      orderBy: [{ scheduledDate: 'asc' }, { jobNumber: 'asc' }],
      select: jobSelect,
    });
  }

  async getJobById(jobId: string, currentUser: JwtPayload): Promise<JobDetails> {
    const job = await this.getJobDetailsOrThrow(jobId);

    if (
      currentUser.role === Role.TECHNICIAN &&
      job.technician.user.id !== currentUser.sub
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
    await this.ensureCustomerAndTechnician(
      createAdminJobDto.customerId,
      createAdminJobDto.technicianId,
    );

    return this.prismaService.job.create({
      data: {
        jobNumber: createAdminJobDto.jobNumber,
        title: createAdminJobDto.title,
        description: createAdminJobDto.description,
        customerId: createAdminJobDto.customerId,
        technicianId: createAdminJobDto.technicianId,
        status: createAdminJobDto.status ?? JobStatus.ASSIGNED,
        scheduledDate: new Date(createAdminJobDto.scheduledDate),
      },
      select: jobSelect,
    });
  }

  async updateAdminJob(
    jobId: string,
    updateAdminJobDto: UpdateAdminJobDto,
  ): Promise<JobDetails> {
    await this.ensureJobExists(jobId);

    if (updateAdminJobDto.customerId) {
      await this.ensureCustomerExists(updateAdminJobDto.customerId);
    }

    if (updateAdminJobDto.technicianId) {
      await this.ensureTechnicianExists(updateAdminJobDto.technicianId);
    }

    return this.prismaService.job.update({
      where: {
        id: jobId,
      },
      data: {
        jobNumber: updateAdminJobDto.jobNumber,
        title: updateAdminJobDto.title,
        description: updateAdminJobDto.description,
        customerId: updateAdminJobDto.customerId,
        technicianId: updateAdminJobDto.technicianId,
        status: updateAdminJobDto.status,
        scheduledDate: updateAdminJobDto.scheduledDate
          ? new Date(updateAdminJobDto.scheduledDate)
          : undefined,
      },
      select: jobSelect,
    });
  }

  async deleteAdminJob(jobId: string): Promise<JobDetails> {
    await this.ensureJobExists(jobId);

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
          technicianId: true,
          status: true,
        },
      });

      if (!job || job.technicianId !== technician.id) {
        throw new NotFoundException('Job not found');
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
    technicianId: string,
  ): Promise<void> {
    await Promise.all([
      this.ensureCustomerExists(customerId),
      this.ensureTechnicianExists(technicianId),
    ]);
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
}
