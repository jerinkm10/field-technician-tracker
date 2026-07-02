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

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsString()
  productServiceId?: string;

  @IsDateString()
  scheduledDate!: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
