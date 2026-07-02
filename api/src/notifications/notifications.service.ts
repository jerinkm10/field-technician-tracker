import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationReferenceType,
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import {
  createPaginationMeta,
  normalizePagination,
} from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

const notificationSelect = Prisma.validator<Prisma.NotificationSelect>()({
  id: true,
  userId: true,
  title: true,
  message: true,
  referenceType: true,
  referenceId: true,
  isRead: true,
  createdAt: true,
});

type CreateNotificationInput = {
  userId: string;
  title: string;
  message: string;
  referenceType: NotificationReferenceType;
  referenceId: string;
};

type NotificationRecord = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

@Injectable()
export class NotificationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listNotifications(
    userId: string,
    query: ListNotificationsQueryDto,
  ) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unreadOnly ? { isRead: false } : {}),
    };

    const [total, unreadCount, notifications] = await Promise.all([
      this.prismaService.notification.count({ where }),
      this.prismaService.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
      this.prismaService.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
        select: notificationSelect,
      }),
    ]);

    return {
      data: notifications,
      meta: createPaginationMeta(total, page, limit),
      unreadCount,
    };
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationRecord> {
    await this.ensureNotificationOwnership(notificationId, userId);

    return this.prismaService.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: true,
      },
      select: notificationSelect,
    });
  }

  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.prismaService.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return {
      updatedCount: result.count,
    };
  }

  async createNotification(
    input: CreateNotificationInput,
  ): Promise<NotificationRecord> {
    return this.prismaService.notification.create({
      data: input,
      select: notificationSelect,
    });
  }

  async createNotifications(
    inputs: readonly CreateNotificationInput[],
  ): Promise<void> {
    if (inputs.length === 0) {
      return;
    }

    await this.prismaService.notification.createMany({
      data: inputs.map((input) => ({
        userId: input.userId,
        title: input.title,
        message: input.message,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      })),
    });
  }

  async notifyUsers(
    userIds: readonly string[],
    payload: Omit<CreateNotificationInput, 'userId'>,
  ): Promise<void> {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return;
    }

    await this.createNotifications(
      uniqueUserIds.map((userId) => ({
        userId,
        ...payload,
      })),
    );
  }

  async notifyAdminUsers(
    payload: Omit<CreateNotificationInput, 'userId'>,
  ): Promise<void> {
    const adminUsers = await this.prismaService.user.findMany({
      where: {
        role: {
          in: [Role.ADMIN_OWNER, Role.ADMIN],
        },
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    await this.notifyUsers(
      adminUsers.map((user) => user.id),
      payload,
    );
  }

  private async ensureNotificationOwnership(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const notification = await this.prismaService.notification.findUnique({
      where: {
        id: notificationId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
  }
}
