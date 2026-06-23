import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingDocumentsModule } from '../billing-documents/billing-documents.module';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';

@Module({
  imports: [AuthModule, BillingDocumentsModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
