import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CompanySettingsService } from './company-settings.service';
import { CreateCompanySettingsDto } from './dto/create-company-settings.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Controller('settings/company')
export class CompanySettingsController {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getCompanySettings() {
    return this.companySettingsService.getCompanySettings();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createCompanySettings(
    @Body() createCompanySettingsDto: CreateCompanySettingsDto,
  ) {
    return this.companySettingsService.createCompanySettings(
      createCompanySettingsDto,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateCompanySettings(
    @Param('id') companyId: string,
    @Body() updateCompanySettingsDto: UpdateCompanySettingsDto,
  ) {
    return this.companySettingsService.updateCompanySettings(
      companyId,
      updateCompanySettingsDto,
    );
  }

  @Post('logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCompanyLogo(
    @UploadedFile() file: any,
    @Req() request: Request,
  ) {
    return this.companySettingsService.storeAsset(
      file,
      'logo',
      `${request.protocol}://${request.get('host')}`,
    );
  }

  @Post('signature')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCompanySignature(
    @UploadedFile() file: any,
    @Req() request: Request,
  ) {
    return this.companySettingsService.storeAsset(
      file,
      'signature',
      `${request.protocol}://${request.get('host')}`,
    );
  }

  @Post('seal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCompanySeal(
    @UploadedFile() file: any,
    @Req() request: Request,
  ) {
    return this.companySettingsService.storeAsset(
      file,
      'seal',
      `${request.protocol}://${request.get('host')}`,
    );
  }

  @Get('assets/:fileName')
  async getCompanyAsset(
    @Param('fileName') fileName: string,
    @Res() response: Response,
  ) {
    const filePath = this.companySettingsService.resolveAssetByFilename(
      fileName,
    );

    return response.sendFile(filePath);
  }
}
