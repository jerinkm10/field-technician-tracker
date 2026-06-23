import { JobStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateAdminJobDto {
  @IsString()
  jobNumber!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  customerId!: string;

  @IsString()
  technicianId!: string;

  @IsDateString()
  scheduledDate!: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
