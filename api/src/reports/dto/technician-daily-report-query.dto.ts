import { JobStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export class TechnicianDailyReportQueryDto {
  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
