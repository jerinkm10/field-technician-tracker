import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyStatus, Prisma } from '@prisma/client';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { basename, extname, resolve } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanySettingsDto } from './dto/create-company-settings.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

const companySelect = Prisma.validator<Prisma.CompanySelect>()({
  id: true,
  companyName: true,
  phone: true,
  email: true,
  gstin: true,
  address: true,
  city: true,
  state: true,
  pinCode: true,
  country: true,
  bankName: true,
  accountNumber: true,
  ifscCode: true,
  logoAttachment: true,
  signatureAttachment: true,
  sealAttachment: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export type CompanySettingsRecord = Prisma.CompanyGetPayload<{
  select: typeof companySelect;
}>;

export type CompanyBrandingRecord = CompanySettingsRecord & {
  logoFilePath: string | null;
  signatureFilePath: string | null;
  sealFilePath: string | null;
};

@Injectable()
export class CompanySettingsService {
  private readonly storageRoot = resolve(process.cwd(), 'storage', 'company');

  constructor(private readonly prismaService: PrismaService) {}

  async getCompanySettings(): Promise<CompanySettingsRecord | null> {
    return this.prismaService.company.findFirst({
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      select: companySelect,
    });
  }

  async getCompanySettingsOrThrow(): Promise<CompanySettingsRecord> {
    const company = await this.getCompanySettings();

    if (!company) {
      throw new NotFoundException('Company settings not found');
    }

    return company;
  }

  async createCompanySettings(
    createCompanySettingsDto: CreateCompanySettingsDto,
  ): Promise<CompanySettingsRecord> {
    const existingCompany = await this.getCompanySettings();

    if (existingCompany) {
      throw new ConflictException(
        'Company settings already exist. Use update instead.',
      );
    }

    return this.prismaService.company.create({
      data: {
        companyName: createCompanySettingsDto.companyName,
        phone: createCompanySettingsDto.phone,
        email: createCompanySettingsDto.email,
        gstin: createCompanySettingsDto.gstin,
        address: createCompanySettingsDto.address,
        city: createCompanySettingsDto.city,
        state: createCompanySettingsDto.state,
        pinCode: createCompanySettingsDto.pinCode,
        country: createCompanySettingsDto.country,
        bankName: createCompanySettingsDto.bankName,
        accountNumber: createCompanySettingsDto.accountNumber,
        ifscCode: createCompanySettingsDto.ifscCode,
        logoAttachment: createCompanySettingsDto.logoAttachment,
        signatureAttachment: createCompanySettingsDto.signatureAttachment,
        sealAttachment: createCompanySettingsDto.sealAttachment,
        status: createCompanySettingsDto.status ?? CompanyStatus.ACTIVE,
      },
      select: companySelect,
    });
  }

  async updateCompanySettings(
    companyId: string,
    updateCompanySettingsDto: UpdateCompanySettingsDto,
  ): Promise<CompanySettingsRecord> {
    await this.ensureCompanyExists(companyId);

    return this.prismaService.company.update({
      where: {
        id: companyId,
      },
      data: {
        companyName: updateCompanySettingsDto.companyName,
        phone: updateCompanySettingsDto.phone,
        email: updateCompanySettingsDto.email,
        gstin: updateCompanySettingsDto.gstin,
        address: updateCompanySettingsDto.address,
        city: updateCompanySettingsDto.city,
        state: updateCompanySettingsDto.state,
        pinCode: updateCompanySettingsDto.pinCode,
        country: updateCompanySettingsDto.country,
        bankName: updateCompanySettingsDto.bankName,
        accountNumber: updateCompanySettingsDto.accountNumber,
        ifscCode: updateCompanySettingsDto.ifscCode,
        logoAttachment: updateCompanySettingsDto.logoAttachment,
        signatureAttachment: updateCompanySettingsDto.signatureAttachment,
        sealAttachment: updateCompanySettingsDto.sealAttachment,
        status: updateCompanySettingsDto.status,
      },
      select: companySelect,
    });
  }

  async storeAsset(
    file: { buffer: Buffer; mimetype?: string; originalname?: string } | undefined,
    assetType: 'logo' | 'signature' | 'seal',
    requestBaseUrl: string,
  ): Promise<{ fileUrl: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are supported');
    }

    await mkdir(this.storageRoot, { recursive: true });

    const extension = extname(file.originalname ?? '') || '.png';
    const fileName = `${assetType}-${Date.now()}-${randomUUID()}${extension}`;
    const filePath = resolve(this.storageRoot, fileName);

    await writeFile(filePath, file.buffer);

    return {
      fileUrl: `${requestBaseUrl}/settings/company/assets/${fileName}`,
    };
  }

  resolveAssetPath(fileUrl: string | null | undefined): string | null {
    if (!fileUrl) {
      return null;
    }

    const fileName = basename(fileUrl);
    const filePath = resolve(this.storageRoot, fileName);

    if (!filePath.startsWith(this.storageRoot) || !existsSync(filePath)) {
      return null;
    }

    return filePath;
  }

  async getCompanyBranding(): Promise<CompanyBrandingRecord | null> {
    const company = await this.getCompanySettings();

    if (!company) {
      return null;
    }

    return {
      ...company,
      logoFilePath: this.resolveAssetPath(company.logoAttachment),
      signatureFilePath: this.resolveAssetPath(company.signatureAttachment),
      sealFilePath: this.resolveAssetPath(company.sealAttachment),
    };
  }

  resolveAssetByFilename(fileName: string): string {
    const safeFileName = basename(fileName);
    const filePath = resolve(this.storageRoot, safeFileName);

    if (!filePath.startsWith(this.storageRoot) || !existsSync(filePath)) {
      throw new NotFoundException('Company asset not found');
    }

    return filePath;
  }

  private async ensureCompanyExists(companyId: string): Promise<void> {
    const company = await this.prismaService.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        id: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Company settings not found');
    }
  }
}
