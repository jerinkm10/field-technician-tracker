import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingDocumentsModule } from '../billing-documents/billing-documents.module';
import { CompanySettingsModule } from '../company-settings/company-settings.module';
import { OutstandingsModule } from '../outstandings/outstandings.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [
    AuthModule,
    BillingDocumentsModule,
    CompanySettingsModule,
    OutstandingsModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
