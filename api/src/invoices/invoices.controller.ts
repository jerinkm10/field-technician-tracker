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
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ADMIN_OWNER)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async listInvoices(
    @Query() query: ListInvoicesQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invoicesService.listInvoices(query, currentUser);
  }

  @Get(':id')
  async getInvoice(
    @Param('id') invoiceId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invoicesService.getInvoiceById(invoiceId, currentUser);
  }

  @Get(':id/pdf')
  async downloadInvoicePdf(
    @Param('id') invoiceId: string,
    @Res({ passthrough: true }) response: Response,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const invoice = await this.invoicesService.getInvoiceById(invoiceId, currentUser);
    const pdfBuffer = await this.invoicesService.getInvoicePdf(invoiceId, currentUser);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    );

    return new StreamableFile(pdfBuffer);
  }

  @Post()
  async createInvoice(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invoicesService.createInvoice(createInvoiceDto, currentUser);
  }

  @Patch(':id')
  async updateInvoice(
    @Param('id') invoiceId: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invoicesService.updateInvoice(invoiceId, updateInvoiceDto, currentUser);
  }

  @Delete(':id')
  async deleteInvoice(
    @Param('id') invoiceId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invoicesService.deleteInvoice(invoiceId, currentUser);
  }
}
