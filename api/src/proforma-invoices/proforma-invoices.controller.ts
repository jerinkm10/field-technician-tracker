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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
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
  async listProformaInvoices(
    @Query() query: ListInvoicesQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.proformaInvoicesService.listProformaInvoices(query, currentUser);
  }

  @Get('next-number')
  async getNextProformaInvoiceNumber(@Query('documentDate') documentDate?: string) {
    return this.proformaInvoicesService.getNextProformaInvoiceNumber(documentDate);
  }

  @Get(':id')
  async getProformaInvoice(
    @Param('id') invoiceId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.proformaInvoicesService.getProformaInvoice(
      invoiceId,
      currentUser,
    );
  }

  @Get(':id/pdf')
  async downloadProformaInvoicePdf(
    @Param('id') invoiceId: string,
    @CurrentUser() currentUser: JwtPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    const invoice = await this.proformaInvoicesService.getProformaInvoice(
      invoiceId,
      currentUser,
    );
    const pdfBuffer =
      await this.proformaInvoicesService.getProformaInvoicePdf(
        invoiceId,
        currentUser,
      );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    );

    return new StreamableFile(pdfBuffer);
  }

  @Post()
  async createProformaInvoice(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.proformaInvoicesService.createProformaInvoice(
      createInvoiceDto,
      currentUser,
    );
  }

  @Patch(':id')
  async updateProformaInvoice(
    @Param('id') invoiceId: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.proformaInvoicesService.updateProformaInvoice(
      invoiceId,
      updateInvoiceDto,
      currentUser,
    );
  }

  @Delete(':id')
  async deleteProformaInvoice(
    @Param('id') invoiceId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.proformaInvoicesService.deleteProformaInvoice(
      invoiceId,
      currentUser,
    );
  }
}
