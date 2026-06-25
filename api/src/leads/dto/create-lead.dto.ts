import { LeadStatus } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateLeadDto {
  @IsString()
  leadName!: string;

  @IsString()
  customerName!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  location!: string;

  @IsString()
  branchId!: string;

  @IsString()
  source!: string;

  @IsString()
  interestedProductServiceId!: string;

  @IsOptional()
  @IsString()
  assignedToEmployeeId?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;
}
