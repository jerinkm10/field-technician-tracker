import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InvoiceInputFieldsController } from './invoice-input-fields.controller';
import { InvoiceInputFieldsService } from './invoice-input-fields.service';

@Module({
  imports: [AuthModule],
  controllers: [InvoiceInputFieldsController],
  providers: [InvoiceInputFieldsService],
  exports: [InvoiceInputFieldsService],
})
export class InvoiceInputFieldsModule {}
