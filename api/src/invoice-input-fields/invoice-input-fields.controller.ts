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
import { CreateInvoiceInputFieldDto } from './dto/create-invoice-input-field.dto';
import { ListInvoiceInputFieldsQueryDto } from './dto/list-invoice-input-fields-query.dto';
import { UpdateInvoiceInputFieldDto } from './dto/update-invoice-input-field.dto';
import { InvoiceInputFieldsService } from './invoice-input-fields.service';

@Controller('invoice-input-fields')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ADMIN_OWNER)
export class InvoiceInputFieldsController {
  constructor(
    private readonly invoiceInputFieldsService: InvoiceInputFieldsService,
  ) {}

  @Get()
  async listInvoiceInputFields(
    @Query() query: ListInvoiceInputFieldsQueryDto,
  ) {
    return this.invoiceInputFieldsService.listInvoiceInputFields(query);
  }

  @Get(':id')
  async getInvoiceInputField(@Param('id') fieldId: string) {
    return this.invoiceInputFieldsService.getInvoiceInputFieldById(fieldId);
  }

  @Post()
  async createInvoiceInputField(
    @Body() createInvoiceInputFieldDto: CreateInvoiceInputFieldDto,
  ) {
    return this.invoiceInputFieldsService.createInvoiceInputField(
      createInvoiceInputFieldDto,
    );
  }

  @Patch(':id')
  async updateInvoiceInputField(
    @Param('id') fieldId: string,
    @Body() updateInvoiceInputFieldDto: UpdateInvoiceInputFieldDto,
  ) {
    return this.invoiceInputFieldsService.updateInvoiceInputField(
      fieldId,
      updateInvoiceInputFieldDto,
    );
  }

  @Delete(':id')
  async deleteInvoiceInputField(@Param('id') fieldId: string) {
    return this.invoiceInputFieldsService.deleteInvoiceInputField(fieldId);
  }
}
