import { Injectable } from '@nestjs/common';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { InvoicesService } from '../invoices/invoices.service';
import { CreateInvoiceDto } from '../invoices/dto/create-invoice.dto';
import { ListInvoicesQueryDto } from '../invoices/dto/list-invoices-query.dto';
import { UpdateInvoiceDto } from '../invoices/dto/update-invoice.dto';

@Injectable()
export class TaxInvoicesService {
  constructor(private readonly invoicesService: InvoicesService) {}

  async listTaxInvoices(query: ListInvoicesQueryDto, currentUser: JwtPayload) {
    return this.invoicesService.listInvoices({
      ...query,
      type: 'TAX',
    }, currentUser);
  }

  async getTaxInvoice(invoiceId: string, currentUser?: JwtPayload) {
    return this.invoicesService.getInvoiceByIdAndType(
      invoiceId,
      'TAX',
      currentUser,
    );
  }

  async getNextTaxInvoiceNumber(documentDate?: string) {
    return this.invoicesService.getNextInvoiceNumber('TAX', documentDate);
  }

  async createTaxInvoice(
    createInvoiceDto: CreateInvoiceDto,
    currentUser: JwtPayload,
  ) {
    return this.invoicesService.createInvoice({
      ...createInvoiceDto,
      invoiceType: 'TAX',
    }, currentUser);
  }

  async updateTaxInvoice(
    invoiceId: string,
    updateInvoiceDto: UpdateInvoiceDto,
    currentUser: JwtPayload,
  ) {
    await this.invoicesService.getInvoiceByIdAndType(
      invoiceId,
      'TAX',
      currentUser,
    );

    return this.invoicesService.updateInvoice(invoiceId, {
      ...updateInvoiceDto,
      invoiceType: 'TAX',
    }, currentUser);
  }

  async deleteTaxInvoice(invoiceId: string, currentUser: JwtPayload) {
    return this.invoicesService.deleteInvoiceByType(
      invoiceId,
      'TAX',
      currentUser,
    );
  }

  async getTaxInvoicePdf(invoiceId: string, currentUser: JwtPayload) {
    return this.invoicesService.getInvoicePdfByType(
      invoiceId,
      'TAX',
      currentUser,
    );
  }
}
