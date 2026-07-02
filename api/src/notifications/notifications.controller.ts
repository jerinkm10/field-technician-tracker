import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async listNotifications(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.listNotifications(currentUser.sub, query);
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.notificationsService.markAsRead(notificationId, currentUser.sub);
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() currentUser: JwtPayload) {
    return this.notificationsService.markAllAsRead(currentUser.sub);
  }
}
