import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JobsService } from './jobs.service';

@Controller('technician')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TECHNICIAN)
export class TechnicianJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('jobs')
  async listTechnicianJobs(@CurrentUser() currentUser: JwtPayload) {
    return this.jobsService.listTechnicianJobs(currentUser.sub);
  }
}
