import { Module } from '@nestjs/common';
import { BillingDocumentsService } from './billing-documents.service';

@Module({
  providers: [BillingDocumentsService],
  exports: [BillingDocumentsService],
})
export class BillingDocumentsModule {}
