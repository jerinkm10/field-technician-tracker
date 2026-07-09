import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TrackingService } from './tracking.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ADMIN_OWNER)
export class AdminTrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('live-map')
  async getLiveMap() {
    return this.trackingService.getLiveMap();
  }

  @Get('technician/:id/history')
  async getTechnicianHistory(@Param('id') technicianId: string) {
    return this.trackingService.getTechnicianHistory(technicianId);
  }
}
