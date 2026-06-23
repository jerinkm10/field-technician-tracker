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
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async listSuppliers(@Query() query: ListSuppliersQueryDto) {
    return this.suppliersService.listSuppliers(query);
  }

  @Get(':id')
  async getSupplier(@Param('id') supplierId: string) {
    return this.suppliersService.getSupplierById(supplierId);
  }

  @Post()
  async createSupplier(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.createSupplier(createSupplierDto);
  }

  @Patch(':id')
  async updateSupplier(
    @Param('id') supplierId: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.updateSupplier(supplierId, updateSupplierDto);
  }

  @Delete(':id')
  async deleteSupplier(@Param('id') supplierId: string) {
    return this.suppliersService.deleteSupplier(supplierId);
  }
}
