import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TechnicianDailyReportQueryDto } from './dto/technician-daily-report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('technician-daily')
  async getTechnicianDailyReport(
    @Query() technicianDailyReportQueryDto: TechnicianDailyReportQueryDto,
  ) {
    return this.reportsService.getTechnicianDailyReport(
      technicianDailyReportQueryDto,
    );
  }
}
