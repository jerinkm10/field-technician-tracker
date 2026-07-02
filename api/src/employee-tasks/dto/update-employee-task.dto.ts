import {
  IsEnum,
  IsOptional,
} from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class UpdateEmployeeTaskDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
