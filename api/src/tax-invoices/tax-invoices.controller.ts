import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateInvoiceDto } from '../invoices/dto/create-invoice.dto';
import { ListInvoicesQueryDto } from '../invoices/dto/list-invoices-query.dto';
import { UpdateInvoiceDto } from '../invoices/dto/update-invoice.dto';
import { TaxInvoicesService } from './tax-invoices.service';

@Controller('tax-invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class TaxInvoicesController {
  constructor(private readonly taxInvoicesService: TaxInvoicesService) {}

  @Get()
  async listTaxInvoices(@Query() query: ListInvoicesQueryDto) {
    return this.taxInvoicesService.listTaxInvoices(query);
  }

  @Get('next-number')
  async getNextTaxInvoiceNumber(@Query('documentDate') documentDate?: string) {
    return this.taxInvoicesService.getNextTaxInvoiceNumber(documentDate);
  }

  @Get(':id')
  async getTaxInvoice(@Param('id') invoiceId: string) {
    return this.taxInvoicesService.getTaxInvoice(invoiceId);
  }

  @Get(':id/pdf')
  async downloadTaxInvoicePdf(
    @Param('id') invoiceId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const invoice = await this.taxInvoicesService.getTaxInvoice(invoiceId);
    const pdfBuffer = await this.taxInvoicesService.getTaxInvoicePdf(invoiceId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${invoice.invoiceNumber}.pdf"`,
    );

    return new StreamableFile(pdfBuffer);
  }

  @Post()
  async createTaxInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.taxInvoicesService.createTaxInvoice(createInvoiceDto);
  }

  @Patch(':id')
  async updateTaxInvoice(
    @Param('id') invoiceId: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.taxInvoicesService.updateTaxInvoice(invoiceId, updateInvoiceDto);
  }

  @Delete(':id')
  async deleteTaxInvoice(@Param('id') invoiceId: string) {
    return this.taxInvoicesService.deleteTaxInvoice(invoiceId);
  }
}
