import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingDocumentsModule } from '../billing-documents/billing-documents.module';
import { CompanySettingsModule } from '../company-settings/company-settings.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [AuthModule, BillingDocumentsModule, CompanySettingsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
