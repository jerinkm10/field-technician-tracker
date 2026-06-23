import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async listInvoices(@Query() query: ListInvoicesQueryDto) {
    return this.invoicesService.listInvoices(query);
  }

  @Get(':id')
  async getInvoice(@Param('id') invoiceId: string) {
    return this.invoicesService.getInvoiceById(invoiceId);
  }

  @Post()
  async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.createInvoice(createInvoiceDto);
  }

  @Patch(':id')
  async updateInvoice(
    @Param('id') invoiceId: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.updateInvoice(invoiceId, updateInvoiceDto);
  }

  @Delete(':id')
  async deleteInvoice(@Param('id') invoiceId: string) {
    return this.invoicesService.deleteInvoice(invoiceId);
  }
}
