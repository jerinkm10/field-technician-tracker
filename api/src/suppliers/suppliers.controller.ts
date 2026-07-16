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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ADMIN_OWNER)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async listSuppliers(
    @Query() query: ListSuppliersQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.suppliersService.listSuppliers(query, currentUser);
  }

  @Get(':id')
  async getSupplier(
    @Param('id') supplierId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.suppliersService.getSupplierById(supplierId, currentUser);
  }

  @Post()
  async createSupplier(
    @Body() createSupplierDto: CreateSupplierDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.suppliersService.createSupplier(createSupplierDto, currentUser);
  }

  @Patch(':id')
  async updateSupplier(
    @Param('id') supplierId: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.suppliersService.updateSupplier(
      supplierId,
      updateSupplierDto,
      currentUser,
    );
  }

  @Delete(':id')
  async deleteSupplier(
    @Param('id') supplierId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.suppliersService.deleteSupplier(supplierId, currentUser);
  }
}
