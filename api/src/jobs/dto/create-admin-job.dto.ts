import { JobPriority, JobStatus } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

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
  branchId?: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  assignedMemberIds?: string[];

  @IsOptional()
  @IsString()
  productServiceId?: string;

  @IsDateString()
  scheduledDate!: string;

  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
