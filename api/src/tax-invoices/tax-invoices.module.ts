import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { TaxInvoicesController } from './tax-invoices.controller';
import { TaxInvoicesService } from './tax-invoices.service';

@Module({
  imports: [AuthModule, InvoicesModule],
  controllers: [TaxInvoicesController],
  providers: [TaxInvoicesService],
})
export class TaxInvoicesModule {}
