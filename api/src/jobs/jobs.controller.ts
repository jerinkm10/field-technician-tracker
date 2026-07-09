import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.TECHNICIAN)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get(':id')
  async getJob(
    @Param('id') jobId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.jobsService.getJobById(jobId, currentUser);
  }

  @Post(':id/start')
  @Roles(Role.TECHNICIAN)
  async startJob(
    @Param('id') jobId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.jobsService.startJob(jobId, currentUser.sub);
  }

  @Post(':id/end')
  @Roles(Role.TECHNICIAN)
  async endJob(
    @Param('id') jobId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.jobsService.endJob(jobId, currentUser.sub);
  }
}
