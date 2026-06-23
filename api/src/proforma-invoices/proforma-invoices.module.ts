import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { ProformaInvoicesController } from './proforma-invoices.controller';
import { ProformaInvoicesService } from './proforma-invoices.service';

@Module({
  imports: [AuthModule, InvoicesModule],
  controllers: [ProformaInvoicesController],
  providers: [ProformaInvoicesService],
})
export class ProformaInvoicesModule {}
