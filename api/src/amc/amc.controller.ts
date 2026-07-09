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
import { CreateAmcDto } from './dto/create-amc.dto';
import { ListAmcQueryDto } from './dto/list-amc-query.dto';
import { UpdateAmcDto } from './dto/update-amc.dto';
import { AmcService } from './amc.service';

@Controller('amc')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ADMIN_OWNER)
export class AmcController {
  constructor(private readonly amcService: AmcService) {}

  @Get()
  async listAmcs(@Query() query: ListAmcQueryDto) {
    return this.amcService.listAmcs(query);
  }

  @Get('dashboard-summary')
  async getDashboardSummary() {
    return this.amcService.getDashboardSummary();
  }

  @Get(':id')
  async getAmc(@Param('id') amcId: string) {
    return this.amcService.getAmcById(amcId);
  }

  @Get(':id/pdf')
  async downloadAmcPdf(
    @Param('id') amcId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { amcNumber, pdfBuffer } = await this.amcService.getAmcPdf(amcId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${amcNumber}.pdf"`,
    );

    return new StreamableFile(pdfBuffer);
  }

  @Post()
  async createAmc(@Body() createAmcDto: CreateAmcDto) {
    return this.amcService.createAmc(createAmcDto);
  }

  @Post(':id/create-invoice')
  async createInvoice(@Param('id') amcId: string) {
    return this.amcService.createInvoiceForAmc(amcId);
  }

  @Patch(':id')
  async updateAmc(
    @Param('id') amcId: string,
    @Body() updateAmcDto: UpdateAmcDto,
  ) {
    return this.amcService.updateAmc(amcId, updateAmcDto);
  }

  @Delete(':id')
  async deleteAmc(@Param('id') amcId: string) {
    return this.amcService.deleteAmc(amcId);
  }
}
