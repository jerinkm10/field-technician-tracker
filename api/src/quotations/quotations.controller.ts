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
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { ListQuotationsQueryDto } from './dto/list-quotations-query.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationsService } from './quotations.service';

@Controller('quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  async listQuotations(@Query() query: ListQuotationsQueryDto) {
    return this.quotationsService.listQuotations(query);
  }

  @Get('next-number')
  async getNextQuotationNumber(@Query('documentDate') documentDate?: string) {
    return this.quotationsService.getNextQuotationNumber(documentDate);
  }

  @Get(':id')
  async getQuotation(@Param('id') quotationId: string) {
    return this.quotationsService.getQuotationById(quotationId);
  }

  @Get(':id/pdf')
  async downloadQuotationPdf(
    @Param('id') quotationId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const quotation = await this.quotationsService.getQuotationById(quotationId);
    const pdfBuffer = await this.quotationsService.getQuotationPdf(quotationId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${quotation.quotationNumber}.pdf"`,
    );

    return new StreamableFile(pdfBuffer);
  }

  @Post()
  async createQuotation(@Body() createQuotationDto: CreateQuotationDto) {
    return this.quotationsService.createQuotation(createQuotationDto);
  }

  @Patch(':id')
  async updateQuotation(
    @Param('id') quotationId: string,
    @Body() updateQuotationDto: UpdateQuotationDto,
  ) {
    return this.quotationsService.updateQuotation(
      quotationId,
      updateQuotationDto,
    );
  }

  @Delete(':id')
  async deleteQuotation(@Param('id') quotationId: string) {
    return this.quotationsService.deleteQuotation(quotationId);
  }
}
