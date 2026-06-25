import { Injectable } from '@nestjs/common';
import { InvoicesService } from '../invoices/invoices.service';
import { CreateInvoiceDto } from '../invoices/dto/create-invoice.dto';
import { ListInvoicesQueryDto } from '../invoices/dto/list-invoices-query.dto';
import { UpdateInvoiceDto } from '../invoices/dto/update-invoice.dto';

@Injectable()
export class ProformaInvoicesService {
  constructor(private readonly invoicesService: InvoicesService) {}

  async listProformaInvoices(query: ListInvoicesQueryDto) {
    return this.invoicesService.listInvoices({
      ...query,
      type: 'PROFORMA',
    });
  }

  async getProformaInvoice(invoiceId: string) {
    return this.invoicesService.getInvoiceByIdAndType(invoiceId, 'PROFORMA');
  }

  async getNextProformaInvoiceNumber(documentDate?: string) {
    return this.invoicesService.getNextInvoiceNumber('PROFORMA', documentDate);
  }

  async createProformaInvoice(createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.createInvoice({
      ...createInvoiceDto,
      invoiceType: 'PROFORMA',
    });
  }

  async updateProformaInvoice(
    invoiceId: string,
    updateInvoiceDto: UpdateInvoiceDto,
  ) {
    await this.invoicesService.getInvoiceByIdAndType(invoiceId, 'PROFORMA');

    return this.invoicesService.updateInvoice(invoiceId, {
      ...updateInvoiceDto,
      invoiceType: 'PROFORMA',
    });
  }

  async deleteProformaInvoice(invoiceId: string) {
    return this.invoicesService.deleteInvoiceByType(invoiceId, 'PROFORMA');
  }

  async getProformaInvoicePdf(invoiceId: string) {
    return this.invoicesService.getInvoicePdfByType(invoiceId, 'PROFORMA');
  }
}
