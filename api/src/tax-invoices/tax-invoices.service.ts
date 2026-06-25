import { Injectable } from '@nestjs/common';
import { InvoicesService } from '../invoices/invoices.service';
import { CreateInvoiceDto } from '../invoices/dto/create-invoice.dto';
import { ListInvoicesQueryDto } from '../invoices/dto/list-invoices-query.dto';
import { UpdateInvoiceDto } from '../invoices/dto/update-invoice.dto';

@Injectable()
export class TaxInvoicesService {
  constructor(private readonly invoicesService: InvoicesService) {}

  async listTaxInvoices(query: ListInvoicesQueryDto) {
    return this.invoicesService.listInvoices({
      ...query,
      type: 'TAX',
    });
  }

  async getTaxInvoice(invoiceId: string) {
    return this.invoicesService.getInvoiceByIdAndType(invoiceId, 'TAX');
  }

  async getNextTaxInvoiceNumber(documentDate?: string) {
    return this.invoicesService.getNextInvoiceNumber('TAX', documentDate);
  }

  async createTaxInvoice(createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.createInvoice({
      ...createInvoiceDto,
      invoiceType: 'TAX',
    });
  }

  async updateTaxInvoice(invoiceId: string, updateInvoiceDto: UpdateInvoiceDto) {
    await this.invoicesService.getInvoiceByIdAndType(invoiceId, 'TAX');

    return this.invoicesService.updateInvoice(invoiceId, {
      ...updateInvoiceDto,
      invoiceType: 'TAX',
    });
  }

  async deleteTaxInvoice(invoiceId: string) {
    return this.invoicesService.deleteInvoiceByType(invoiceId, 'TAX');
  }

  async getTaxInvoicePdf(invoiceId: string) {
    return this.invoicesService.getInvoicePdfByType(invoiceId, 'TAX');
  }
}
