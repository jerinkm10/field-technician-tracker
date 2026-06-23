import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
          technicianId: technician.id,
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

    return technicians.map(({ jobs, locationLogs, ...technician }) => ({
      ...technician,
      activeJob: jobs[0] ?? null,
      latestLocation: locationLogs[0] ?? null,
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
}
