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
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { ListQuotationsQueryDto } from './dto/list-quotations-query.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationsService } from './quotations.service';

@Controller('quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ADMIN_OWNER)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  async listQuotations(
    @Query() query: ListQuotationsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.quotationsService.listQuotations(query, currentUser);
  }

  @Get('next-number')
  async getNextQuotationNumber(@Query('documentDate') documentDate?: string) {
    return this.quotationsService.getNextQuotationNumber(documentDate);
  }

  @Get(':id')
  async getQuotation(
    @Param('id') quotationId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.quotationsService.getQuotationById(quotationId, currentUser);
  }

  @Get(':id/pdf')
  async downloadQuotationPdf(
    @Param('id') quotationId: string,
    @CurrentUser() currentUser: JwtPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    const quotation = await this.quotationsService.getQuotationById(
      quotationId,
      currentUser,
    );
    const pdfBuffer = await this.quotationsService.getQuotationPdf(
      quotationId,
      currentUser,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${quotation.quotationNumber}.pdf"`,
    );

    return new StreamableFile(pdfBuffer);
  }

  @Post()
  async createQuotation(
    @Body() createQuotationDto: CreateQuotationDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.quotationsService.createQuotation(createQuotationDto, currentUser);
  }

  @Patch(':id')
  async updateQuotation(
    @Param('id') quotationId: string,
    @Body() updateQuotationDto: UpdateQuotationDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.quotationsService.updateQuotation(
      quotationId,
      updateQuotationDto,
      currentUser,
    );
  }

  @Delete(':id')
  async deleteQuotation(
    @Param('id') quotationId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.quotationsService.deleteQuotation(quotationId, currentUser);
  }
}
