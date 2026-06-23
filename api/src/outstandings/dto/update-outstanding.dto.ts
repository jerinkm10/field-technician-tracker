import {
  OutstandingStatus,
} from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateOutstandingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditAmount?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(OutstandingStatus)
  status?: OutstandingStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
