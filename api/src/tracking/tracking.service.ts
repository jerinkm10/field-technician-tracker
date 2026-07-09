import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JobAssignmentRoleType,
  JobAssignmentStatus,
  JobStatus,
  Prisma,
} from '@prisma/client';
import { TrackingGateway } from './tracking.gateway';
import { PostLocationDto } from './dto/post-location.dto';
import { PrismaService } from '../prisma/prisma.service';

const locationLogSelect = Prisma.validator<Prisma.LocationLogSelect>()({
  id: true,
  technicianId: true,
  jobId: true,
  latitude: true,
  longitude: true,
  accuracy: true,
  speed: true,
  batteryLevel: true,
  recordedAt: true,
  job: {
    select: {
      id: true,
      jobNumber: true,
      title: true,
      status: true,
    },
  },
});

const technicianLocationSnapshotSelect =
  Prisma.validator<Prisma.TechnicianSelect>()({
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
  });

type LocationLogSnapshot = Prisma.LocationLogGetPayload<{
  select: typeof locationLogSelect;
}>;

type TechnicianLocationSnapshot = Prisma.TechnicianGetPayload<{
  select: typeof technicianLocationSnapshotSelect;
}>;

type TechnicianRouteJob = {
  id: string;
  jobNumber: string;
  title: string;
  status: JobStatus;
  routeStatus: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  scheduledDate: Date;
  customer: {
    id: string;
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  };
};

type SavedLocationPayload = {
  location: LocationLogSnapshot;
  technician: TechnicianLocationSnapshot;
};

@Injectable()
export class TrackingService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly trackingGateway: TrackingGateway,
  ) {}

  async saveLocation(
    userId: string,
    postLocationDto: PostLocationDto,
  ): Promise<SavedLocationPayload> {
    const technician = await this.prismaService.technician.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!technician) {
      throw new ForbiddenException('Technician profile not found');
    }

    if (postLocationDto.jobId) {
      const assignedJob = await this.prismaService.job.findFirst({
        where: {
          id: postLocationDto.jobId,
          OR: [
            {
              technicianId: technician.id,
            },
            {
              assignments: {
                some: {
                  userId,
                  roleType: JobAssignmentRoleType.TECHNICIAN,
                },
              },
            },
          ],
        },
        select: {
          id: true,
        },
      });

      if (!assignedJob) {
        throw new NotFoundException(
          'Assigned job not found for this technician',
        );
      }
    }

    const recordedAt = new Date(postLocationDto.recordedAt);

    const payload = await this.prismaService.$transaction(async (transaction) => {
      const location = await transaction.locationLog.create({
        data: {
          technicianId: technician.id,
          jobId: postLocationDto.jobId,
          latitude: postLocationDto.latitude,
          longitude: postLocationDto.longitude,
          accuracy: postLocationDto.accuracy,
          speed: postLocationDto.speed,
          batteryLevel: postLocationDto.batteryLevel,
          recordedAt,
        },
        select: locationLogSelect,
      });

      const updatedTechnician = await transaction.technician.update({
        where: {
          id: technician.id,
        },
        data: {
          currentLatitude: postLocationDto.latitude,
          currentLongitude: postLocationDto.longitude,
          lastSeenAt: recordedAt,
        },
        select: technicianLocationSnapshotSelect,
      });

      return {
        location,
        technician: updatedTechnician,
      };
    });

    this.trackingGateway.emitTechnicianLocationUpdated(payload);

    return payload;
  }

  async getLiveMap() {
    const today = this.startOfDay(new Date());
    const tomorrow = this.addDays(today, 1);
    const technicians = await this.prismaService.technician.findMany({
      orderBy: [
        {
          lastSeenAt: 'desc',
        },
        {
          id: 'asc',
        },
      ],
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
        jobs: {
          where: {
            status: {
              in: ['ASSIGNED', 'STARTED'],
            },
          },
          orderBy: [
            {
              status: 'desc',
            },
            {
              scheduledDate: 'asc',
            },
          ],
          take: 1,
          select: {
            id: true,
            jobNumber: true,
            title: true,
            status: true,
            scheduledDate: true,
            customer: {
              select: {
                id: true,
                name: true,
                address: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
        locationLogs: {
          orderBy: {
            recordedAt: 'desc',
          },
          take: 1,
          select: locationLogSelect,
        },
      },
    });

    const technicianUserIds = technicians.map((technician) => technician.user.id);
    const technicianIds = technicians.map((technician) => technician.id);

    const todayJobs = await this.prismaService.job.findMany({
      where: {
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
        OR: [
          {
            technicianId: {
              in: technicianIds,
            },
          },
          {
            assignments: {
              some: {
                roleType: JobAssignmentRoleType.TECHNICIAN,
                userId: {
                  in: technicianUserIds,
                },
              },
            },
          },
        ],
      },
      orderBy: [{ scheduledDate: 'asc' }, { jobNumber: 'asc' }],
      select: {
        id: true,
        jobNumber: true,
        title: true,
        status: true,
        scheduledDate: true,
        technicianId: true,
        customer: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
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

    const routeJobsByTechnician = new Map<string, TechnicianRouteJob[]>(
      technicians.map((technician) => [
        technician.id,
        [] as TechnicianRouteJob[],
      ]),
    );

    for (const job of todayJobs) {
      const assignmentUserIds = job.assignments.map((assignment) => assignment.userId);
      const mappedTechnicians = technicians.filter((technician) => {
        if (job.technicianId === technician.id) {
          return true;
        }

        return assignmentUserIds.includes(technician.user.id);
      });

      for (const technician of mappedTechnicians) {
        const assignment = job.assignments.find(
          (item) => item.userId === technician.user.id,
        );

        const routeJob: TechnicianRouteJob = {
          id: job.id,
          jobNumber: job.jobNumber,
          title: job.title,
          status: job.status,
          routeStatus: this.resolveRouteStatus(job.status, assignment?.status),
          scheduledDate: job.scheduledDate,
          customer: job.customer,
        };

        routeJobsByTechnician.set(technician.id, [
          ...(routeJobsByTechnician.get(technician.id) ?? []),
          routeJob,
        ]);
      }
    }

    return technicians.map(({ jobs, locationLogs, ...technician }) => ({
      ...technician,
      activeJob: jobs[0] ?? null,
      latestLocation: locationLogs[0] ?? null,
      todayRouteJobs: routeJobsByTechnician.get(technician.id) ?? [],
    }));
  }

  async getTechnicianHistory(technicianId: string) {
    const technician = await this.prismaService.technician.findUnique({
      where: {
        id: technicianId,
      },
      select: technicianLocationSnapshotSelect,
    });

    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    const history = await this.prismaService.locationLog.findMany({
      where: {
        technicianId,
      },
      orderBy: {
        recordedAt: 'desc',
      },
      select: locationLogSelect,
    });

    return {
      technician,
      history,
    };
  }

  private resolveRouteStatus(
    jobStatus: JobStatus,
    assignmentStatus?: JobAssignmentStatus,
  ): 'TODO' | 'IN_PROGRESS' | 'COMPLETED' {
    if (
      jobStatus === JobStatus.COMPLETED ||
      assignmentStatus === JobAssignmentStatus.COMPLETED
    ) {
      return 'COMPLETED';
    }

    if (
      jobStatus === JobStatus.STARTED ||
      assignmentStatus === JobAssignmentStatus.ACCEPTED ||
      assignmentStatus === JobAssignmentStatus.IN_PROGRESS
    ) {
      return 'IN_PROGRESS';
    }

    return 'TODO';
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private addDays(value: Date, days: number): Date {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return this.startOfDay(next);
  }
}
