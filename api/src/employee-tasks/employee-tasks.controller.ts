import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ListEmployeeTasksQueryDto } from './dto/list-employee-tasks-query.dto';
import { UpdateEmployeeTaskDto } from './dto/update-employee-task.dto';
import { EmployeeTasksService } from './employee-tasks.service';

@Controller('employee-tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE, Role.TECHNICIAN)
export class EmployeeTasksController {
  constructor(private readonly employeeTasksService: EmployeeTasksService) {}

  @Get()
  async listTasks(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: ListEmployeeTasksQueryDto,
  ) {
    return this.employeeTasksService.listTasks(currentUser, query);
  }

  @Get('summary')
  async getTaskSummary(@CurrentUser() currentUser: JwtPayload) {
    return this.employeeTasksService.getTaskSummary(currentUser);
  }

  @Patch(':id/status')
  async updateTaskStatus(
    @Param('id') taskId: string,
    @Body() updateEmployeeTaskDto: UpdateEmployeeTaskDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.employeeTasksService.updateTaskStatus(
      taskId,
      updateEmployeeTaskDto,
      currentUser,
    );
  }
}
