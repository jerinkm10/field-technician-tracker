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
  async listAmcs(
    @Query() query: ListAmcQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.amcService.listAmcs(query, currentUser);
  }

  @Get('dashboard-summary')
  async getDashboardSummary(@CurrentUser() currentUser: JwtPayload) {
    return this.amcService.getDashboardSummary(currentUser);
  }

  @Get(':id')
  async getAmc(
    @Param('id') amcId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.amcService.getAmcById(amcId, currentUser);
  }

  @Get(':id/pdf')
  async downloadAmcPdf(
    @Param('id') amcId: string,
    @CurrentUser() currentUser: JwtPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { amcNumber, pdfBuffer } = await this.amcService.getAmcPdf(
      amcId,
      currentUser,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${amcNumber}.pdf"`,
    );

    return new StreamableFile(pdfBuffer);
  }

  @Post()
  async createAmc(
    @Body() createAmcDto: CreateAmcDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.amcService.createAmc(createAmcDto, currentUser);
  }

  @Post(':id/create-invoice')
  async createInvoice(
    @Param('id') amcId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.amcService.createInvoiceForAmc(amcId, currentUser);
  }

  @Patch(':id')
  async updateAmc(
    @Param('id') amcId: string,
    @Body() updateAmcDto: UpdateAmcDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.amcService.updateAmc(amcId, updateAmcDto, currentUser);
  }

  @Delete(':id')
  async deleteAmc(
    @Param('id') amcId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.amcService.deleteAmc(amcId, currentUser);
  }
}
