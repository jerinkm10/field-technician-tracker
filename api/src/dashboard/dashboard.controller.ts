import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PerformanceDashboardQueryDto } from './dto/performance-dashboard-query.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('business-summary')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
  async getBusinessSummary() {
    return this.dashboardService.getBusinessSummary();
  }

  @Get('employee-summary')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async getEmployeeSummary(@CurrentUser() currentUser: JwtPayload) {
    return this.dashboardService.getEmployeeSummary(currentUser);
  }

  @Get('performance')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
  async getPerformanceDashboard(
    @Query() query: PerformanceDashboardQueryDto,
  ) {
    return this.dashboardService.getPerformanceDashboard(query);
  }
}
