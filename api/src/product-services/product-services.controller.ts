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
import { CreateProductServiceDto } from './dto/create-product-service.dto';
import { ListProductServicesQueryDto } from './dto/list-product-services-query.dto';
import { UpdateProductServiceDto } from './dto/update-product-service.dto';
import { ProductServicesService } from './product-services.service';

@Controller('products-services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ProductServicesController {
  constructor(
    private readonly productServicesService: ProductServicesService,
  ) {}

  @Get()
  async listProductServices(@Query() query: ListProductServicesQueryDto) {
    return this.productServicesService.listProductServices(query);
  }

  @Get(':id')
  async getProductService(@Param('id') productServiceId: string) {
    return this.productServicesService.getProductServiceById(productServiceId);
  }

  @Post()
  async createProductService(
    @Body() createProductServiceDto: CreateProductServiceDto,
  ) {
    return this.productServicesService.createProductService(
      createProductServiceDto,
    );
  }

  @Patch(':id')
  async updateProductService(
    @Param('id') productServiceId: string,
    @Body() updateProductServiceDto: UpdateProductServiceDto,
  ) {
    return this.productServicesService.updateProductService(
      productServiceId,
      updateProductServiceDto,
    );
  }

  @Delete(':id')
  async deleteProductService(@Param('id') productServiceId: string) {
    return this.productServicesService.deleteProductService(productServiceId);
  }
}
