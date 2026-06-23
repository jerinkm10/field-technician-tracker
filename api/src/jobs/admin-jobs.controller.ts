import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateAdminJobDto } from './dto/create-admin-job.dto';
import { UpdateAdminJobDto } from './dto/update-admin-job.dto';
import { JobsService } from './jobs.service';

@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async listJobs() {
    return this.jobsService.listAdminJobs();
  }

  @Post()
  async createJob(@Body() createAdminJobDto: CreateAdminJobDto) {
    return this.jobsService.createAdminJob(createAdminJobDto);
  }

  @Patch(':id')
  async updateJob(
    @Param('id') jobId: string,
    @Body() updateAdminJobDto: UpdateAdminJobDto,
  ) {
    return this.jobsService.updateAdminJob(jobId, updateAdminJobDto);
  }

  @Delete(':id')
  async deleteJob(@Param('id') jobId: string) {
    return this.jobsService.deleteAdminJob(jobId);
  }
}
