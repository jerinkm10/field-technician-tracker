import { Injectable } from '@nestjs/common';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { InvoicesService } from '../invoices/invoices.service';
import { CreateInvoiceDto } from '../invoices/dto/create-invoice.dto';
import { ListInvoicesQueryDto } from '../invoices/dto/list-invoices-query.dto';
import { UpdateInvoiceDto } from '../invoices/dto/update-invoice.dto';

@Injectable()
export class ProformaInvoicesService {
  constructor(private readonly invoicesService: InvoicesService) {}

  async listProformaInvoices(
    query: ListInvoicesQueryDto,
    currentUser: JwtPayload,
  ) {
    return this.invoicesService.listInvoices({
      ...query,
      type: 'PROFORMA',
    }, currentUser);
  }

  async getProformaInvoice(invoiceId: string, currentUser?: JwtPayload) {
    return this.invoicesService.getInvoiceByIdAndType(
      invoiceId,
      'PROFORMA',
      currentUser,
    );
  }

  async getNextProformaInvoiceNumber(documentDate?: string) {
    return this.invoicesService.getNextInvoiceNumber('PROFORMA', documentDate);
  }

  async createProformaInvoice(
    createInvoiceDto: CreateInvoiceDto,
    currentUser: JwtPayload,
  ) {
    return this.invoicesService.createInvoice({
      ...createInvoiceDto,
      invoiceType: 'PROFORMA',
    }, currentUser);
  }

  async updateProformaInvoice(
    invoiceId: string,
    updateInvoiceDto: UpdateInvoiceDto,
    currentUser: JwtPayload,
  ) {
    await this.invoicesService.getInvoiceByIdAndType(
      invoiceId,
      'PROFORMA',
      currentUser,
    );

    return this.invoicesService.updateInvoice(invoiceId, {
      ...updateInvoiceDto,
      invoiceType: 'PROFORMA',
    }, currentUser);
  }

  async deleteProformaInvoice(invoiceId: string, currentUser: JwtPayload) {
    return this.invoicesService.deleteInvoiceByType(
      invoiceId,
      'PROFORMA',
      currentUser,
    );
  }

  async getProformaInvoicePdf(invoiceId: string, currentUser: JwtPayload) {
    return this.invoicesService.getInvoicePdfByType(
      invoiceId,
      'PROFORMA',
      currentUser,
    );
  }
}
