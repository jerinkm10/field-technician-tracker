import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  TaskPriority,
  TaskReferenceType,
  TaskStatus,
} from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListEmployeeTasksQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskReferenceType)
  referenceType?: TaskReferenceType;

  @IsOptional()
  @IsString()
  assignedEmployeeId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  todayOnly?: boolean;
}
