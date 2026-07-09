import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async listCustomers(@Query() query: ListCustomersQueryDto) {
    return this.customersService.listCustomers(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async getCustomer(@Param('id') customerId: string) {
    return this.customersService.getCustomerById(customerId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
  async createCustomer(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.createCustomer(createCustomerDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
  async updateCustomer(
    @Param('id') customerId: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.updateCustomer(customerId, updateCustomerDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
  async deleteCustomer(@Param('id') customerId: string) {
    return this.customersService.deleteCustomer(customerId);
  }
}
