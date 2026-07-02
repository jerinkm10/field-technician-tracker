import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class PerformanceDashboardQueryDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
