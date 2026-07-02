import { JobStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateAdminJobDto {
  @IsOptional()
  @IsString()
  jobNumber?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsString()
  productServiceId?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
