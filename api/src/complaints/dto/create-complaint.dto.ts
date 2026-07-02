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

export class CreateComplaintDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  customerName!: string;

  @IsEnum(ComplaintContactPerson)
  contactPerson!: ComplaintContactPerson;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  address!: string;

  @IsString()
  location!: string;

  @IsString()
  complaintTitle!: string;

  @IsString()
  complaintDescription!: string;

  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @IsOptional()
  @IsString()
  assignedEmployeeId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
