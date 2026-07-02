import {
  ComplaintContactPerson,
  ComplaintStatus,
} from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateComplaintDto {
  @IsOptional()
  @IsString()
  customerId?: string | null;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEnum(ComplaintContactPerson)
  contactPerson?: ComplaintContactPerson;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  complaintTitle?: string;

  @IsOptional()
  @IsString()
  complaintDescription?: string;

  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @IsOptional()
  @IsString()
  assignedEmployeeId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
