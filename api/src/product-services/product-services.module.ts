import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductServicesController } from './product-services.controller';
import { ProductServicesService } from './product-services.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductServicesController],
  providers: [ProductServicesService],
  exports: [ProductServicesService],
})
export class ProductServicesModule {}
