import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateAdminJobDto } from './dto/create-admin-job.dto';
import { ListAdminJobsQueryDto } from './dto/list-admin-jobs-query.dto';
import { UpdateAdminJobDto } from './dto/update-admin-job.dto';
import { JobsService } from './jobs.service';

@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ADMIN_OWNER)
export class AdminJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async listJobs(
    @Query() query: ListAdminJobsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.jobsService.listAdminJobs(query, currentUser);
  }

  @Post()
  async createJob(
    @Body() createAdminJobDto: CreateAdminJobDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.jobsService.createAdminJob(createAdminJobDto, currentUser);
  }

  @Patch(':id')
  async updateJob(
    @Param('id') jobId: string,
    @Body() updateAdminJobDto: UpdateAdminJobDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.jobsService.updateAdminJob(
      jobId,
      updateAdminJobDto,
      currentUser,
    );
  }

  @Delete(':id')
  async deleteJob(
    @Param('id') jobId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.jobsService.deleteAdminJob(jobId, currentUser);
  }
}
