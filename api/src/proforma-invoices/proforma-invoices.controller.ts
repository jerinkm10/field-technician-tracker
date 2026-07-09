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
import { ProformaInvoicesService } from './proforma-invoices.service';

@Controller('proforma-invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ADMIN_OWNER)
export class ProformaInvoicesController {
  constructor(
    private readonly proformaInvoicesService: ProformaInvoicesService,
  ) {}

  @Get()
  async listProformaInvoices(@Query() query: ListInvoicesQueryDto) {
    return this.proformaInvoicesService.listProformaInvoices(query);
  }

  @Get('next-number')
  async getNextProformaInvoiceNumber(@Query('documentDate') documentDate?: string) {
    return this.proformaInvoicesService.getNextProformaInvoiceNumber(documentDate);
  }

  @Get(':id')
  async getProformaInvoice(@Param('id') invoiceId: string) {
    return this.proformaInvoicesService.getProformaInvoice(invoiceId);
  }

  @Get(':id/pdf')
  async downloadProformaInvoicePdf(
    @Param('id') invoiceId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const invoice = await this.proformaInvoicesService.getProformaInvoice(invoiceId);
    const pdfBuffer =
      await this.proformaInvoicesService.getProformaInvoicePdf(invoiceId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    );

    return new StreamableFile(pdfBuffer);
  }

  @Post()
  async createProformaInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.proformaInvoicesService.createProformaInvoice(createInvoiceDto);
  }

  @Patch(':id')
  async updateProformaInvoice(
    @Param('id') invoiceId: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.proformaInvoicesService.updateProformaInvoice(
      invoiceId,
      updateInvoiceDto,
    );
  }

  @Delete(':id')
  async deleteProformaInvoice(@Param('id') invoiceId: string) {
    return this.proformaInvoicesService.deleteProformaInvoice(invoiceId);
  }
}
