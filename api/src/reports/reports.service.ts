import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TechnicianDailyReportQueryDto } from './dto/technician-daily-report-query.dto';

type TechnicianDailyReportRow = {
  technicianId: string;
  technicianName: string;
  totalJobs: number;
  completedJobs: number;
  totalTravelDistance: number;
  totalSiteTime: number;
  firstLocationTime: Date | null;
  lastLocationTime: Date | null;
};

type ReportTechnicianRecord = {
  id: string;
  user: {
    name: string;
  };
  jobs: {
    id: string;
    status: JobStatus;
  }[];
  jobVisits: {
    checkInAt: Date;
    checkOutAt: Date | null;
  }[];
  locationLogs: {
    latitude: number;
    longitude: number;
    recordedAt: Date;
  }[];
};

@Injectable()
export class ReportsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getTechnicianDailyReport(
    query: TechnicianDailyReportQueryDto,
  ): Promise<TechnicianDailyReportRow[]> {
    const date = query.date ?? this.formatDateOnly(new Date());
    const { startOfDay, endOfDay } = this.getUtcDateRange(date);

    const technicianRecords = query.technicianId
      ? [await this.getTechnicianRecordById(query.technicianId, query.status, startOfDay, endOfDay)]
      : await this.getTechnicianRecords(query.status, startOfDay, endOfDay);

    return technicianRecords
      .map((technician) => this.toDailyReportRow(technician, startOfDay, endOfDay))
      .sort((left, right) => left.technicianName.localeCompare(right.technicianName));
  }

  private async getTechnicianRecordById(
    technicianId: string,
    status: JobStatus | undefined,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<ReportTechnicianRecord> {
    const technician = await this.prismaService.technician.findUnique({
      where: {
        id: technicianId,
      },
      select: this.reportTechnicianSelect(status, startOfDay, endOfDay),
    });

    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    return technician;
  }

  private async getTechnicianRecords(
    status: JobStatus | undefined,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<ReportTechnicianRecord[]> {
    const jobFilter = this.jobActivityWhere(status, startOfDay, endOfDay);
    const locationFilter = this.locationLogWhere(status, startOfDay, endOfDay);

    return this.prismaService.technician.findMany({
      where: {
        OR: [
          {
            jobs: {
              some: jobFilter,
            },
          },
          {
            locationLogs: {
              some: locationFilter,
            },
          },
        ],
      },
      select: this.reportTechnicianSelect(status, startOfDay, endOfDay),
    });
  }

  private reportTechnicianSelect(
    status: JobStatus | undefined,
    startOfDay: Date,
    endOfDay: Date,
  ): Prisma.TechnicianSelect {
    return {
      id: true,
      user: {
        select: {
          name: true,
        },
      },
      jobs: {
        where: this.jobActivityWhere(status, startOfDay, endOfDay),
        select: {
          id: true,
          status: true,
        },
      },
      jobVisits: {
        where: {
          OR: [
            {
              checkInAt: {
                lte: endOfDay,
              },
              checkOutAt: {
                gte: startOfDay,
              },
            },
            {
              checkInAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
              checkOutAt: null,
            },
          ],
          job: this.jobActivityWhere(status, startOfDay, endOfDay),
        },
        orderBy: {
          checkInAt: 'asc',
        },
        select: {
          checkInAt: true,
          checkOutAt: true,
        },
      },
      locationLogs: {
        where: this.locationLogWhere(status, startOfDay, endOfDay),
        orderBy: {
          recordedAt: 'asc',
        },
        select: {
          latitude: true,
          longitude: true,
          recordedAt: true,
        },
      },
    };
  }

  private jobActivityWhere(
    status: JobStatus | undefined,
    startOfDay: Date,
    endOfDay: Date,
  ): Prisma.JobWhereInput {
    return {
      ...(status ? { status } : {}),
      OR: [
        {
          scheduledDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        {
          startedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        {
          completedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        {
          visits: {
            some: {
              OR: [
                {
                  checkInAt: {
                    lte: endOfDay,
                  },
                  checkOutAt: {
                    gte: startOfDay,
                  },
                },
                {
                  checkInAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                  },
                  checkOutAt: null,
                },
              ],
            },
          },
        },
      ],
    };
  }

  private locationLogWhere(
    status: JobStatus | undefined,
    startOfDay: Date,
    endOfDay: Date,
  ): Prisma.LocationLogWhereInput {
    return {
      recordedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      ...(status
        ? {
            job: {
              is: {
                status,
              },
            },
          }
        : {}),
    };
  }

  private toDailyReportRow(
    technician: ReportTechnicianRecord,
    startOfDay: Date,
    endOfDay: Date,
  ): TechnicianDailyReportRow {
    const totalTravelDistance = this.roundToTwoDecimals(
      this.calculateTravelDistance(technician.locationLogs),
    );

    const totalSiteTime = technician.jobVisits.reduce((total, visit) => {
      return total + this.calculateVisitMinutes(visit.checkInAt, visit.checkOutAt, startOfDay, endOfDay);
    }, 0);

    const firstLocationTime =
      technician.locationLogs.length > 0
        ? technician.locationLogs[0].recordedAt
        : null;
    const lastLocationTime =
      technician.locationLogs.length > 0
        ? technician.locationLogs[technician.locationLogs.length - 1].recordedAt
        : null;

    return {
      technicianId: technician.id,
      technicianName: technician.user.name,
      totalJobs: technician.jobs.length,
      completedJobs: technician.jobs.filter((job) => job.status === JobStatus.COMPLETED).length,
      totalTravelDistance,
      totalSiteTime,
      firstLocationTime,
      lastLocationTime,
    };
  }

  private calculateVisitMinutes(
    checkInAt: Date,
    checkOutAt: Date | null,
    startOfDay: Date,
    endOfDay: Date,
  ): number {
    const visitStart = Math.max(checkInAt.getTime(), startOfDay.getTime());
    const visitEnd = Math.min(
      (checkOutAt ?? new Date()).getTime(),
      endOfDay.getTime(),
    );

    if (visitEnd <= visitStart) {
      return 0;
    }

    return Math.round((visitEnd - visitStart) / 60000);
  }

  private calculateTravelDistance(
    locationLogs: ReportTechnicianRecord['locationLogs'],
  ): number {
    if (locationLogs.length < 2) {
      return 0;
    }

    return locationLogs.slice(1).reduce((total, current, index) => {
      const previous = locationLogs[index];

      return (
        total +
        this.haversineDistance(
          previous.latitude,
          previous.longitude,
          current.latitude,
          current.longitude,
        )
      );
    }, 0);
  }

  private haversineDistance(
    startLatitude: number,
    startLongitude: number,
    endLatitude: number,
    endLongitude: number,
  ): number {
    const earthRadiusKm = 6371;
    const latitudeDelta = this.toRadians(endLatitude - startLatitude);
    const longitudeDelta = this.toRadians(endLongitude - startLongitude);
    const startLatitudeRadians = this.toRadians(startLatitude);
    const endLatitudeRadians = this.toRadians(endLatitude);

    const haversine =
      Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
      Math.cos(startLatitudeRadians) *
        Math.cos(endLatitudeRadians) *
        Math.sin(longitudeDelta / 2) *
        Math.sin(longitudeDelta / 2);

    const angularDistance =
      2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return earthRadiusKm * angularDistance;
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private getUtcDateRange(date: string): {
    startOfDay: Date;
    endOfDay: Date;
  } {
    const [year, month, day] = date.split('-').map(Number);

    return {
      startOfDay: new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)),
      endOfDay: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)),
    };
  }

  private formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
