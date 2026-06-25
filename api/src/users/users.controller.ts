import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UsersService } from './users.service';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async listEmployees(@Query() query: ListEmployeesQueryDto) {
    return this.usersService.listEmployees(query);
  }

  @Get(':id')
  async getEmployee(@Param('id') userId: string) {
    return this.usersService.getEmployeeById(userId);
  }

  @Post()
  async createEmployee(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.createEmployee(createEmployeeDto, currentUser);
  }

  @Patch(':id')
  async updateEmployee(
    @Param('id') userId: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.updateEmployee(userId, updateEmployeeDto, currentUser);
  }
}
