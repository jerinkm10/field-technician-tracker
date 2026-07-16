import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TrackingService } from './tracking.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ADMIN_OWNER)
export class AdminTrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('live-map')
  async getLiveMap(@CurrentUser() currentUser: JwtPayload) {
    return this.trackingService.getLiveMap(currentUser);
  }

  @Get('technician/:id/history')
  async getTechnicianHistory(
    @Param('id') technicianId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.trackingService.getTechnicianHistory(technicianId, currentUser);
  }
}
