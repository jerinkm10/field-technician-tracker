import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const attendanceSelect = Prisma.validator<Prisma.AttendanceSelect>()({
  id: true,
  userId: true,
  checkInAt: true,
  checkOutAt: true,
  checkInLatitude: true,
  checkInLongitude: true,
  checkInAccuracy: true,
  checkOutLatitude: true,
  checkOutLongitude: true,
  checkOutAccuracy: true,
  createdAt: true,
  updatedAt: true,
});

@Injectable()
export class AttendanceService {
  constructor(private readonly prismaService: PrismaService) {}

  async getMyAttendance(userId: string) {
    const [activeSession, recentSessions] = await Promise.all([
      this.prismaService.attendance.findFirst({
        where: {
          userId,
          checkOutAt: null,
        },
        orderBy: {
          checkInAt: 'desc',
        },
        select: attendanceSelect,
      }),
      this.prismaService.attendance.findMany({
        where: {
          userId,
        },
        orderBy: {
          checkInAt: 'desc',
        },
        take: 20,
        select: attendanceSelect,
      }),
    ]);

    return {
      activeSession,
      recentSessions,
    };
  }

  async checkIn(
    userId: string,
    input: {
      latitude?: number;
      longitude?: number;
      accuracy?: number;
    },
  ) {
    const existingActiveSession = await this.prismaService.attendance.findFirst({
      where: {
        userId,
        checkOutAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existingActiveSession) {
      throw new BadRequestException('You already have an active attendance session');
    }

    return this.prismaService.attendance.create({
      data: {
        userId,
        checkInAt: new Date(),
        checkInLatitude: input.latitude,
        checkInLongitude: input.longitude,
        checkInAccuracy: input.accuracy,
      },
      select: attendanceSelect,
    });
  }

  async checkOut(
    userId: string,
    input: {
      latitude?: number;
      longitude?: number;
      accuracy?: number;
    },
  ) {
    const activeSession = await this.prismaService.attendance.findFirst({
      where: {
        userId,
        checkOutAt: null,
      },
      orderBy: {
        checkInAt: 'desc',
      },
      select: {
        id: true,
      },
    });

    if (!activeSession) {
      throw new BadRequestException('No active attendance session was found');
    }

    return this.prismaService.attendance.update({
      where: {
        id: activeSession.id,
      },
      data: {
        checkOutAt: new Date(),
        checkOutLatitude: input.latitude,
        checkOutLongitude: input.longitude,
        checkOutAccuracy: input.accuracy,
      },
      select: attendanceSelect,
    });
  }
}
