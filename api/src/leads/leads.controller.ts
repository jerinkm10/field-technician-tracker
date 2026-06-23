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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AddLeadNoteDto } from './dto/add-lead-note.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  async listLeads(@Query() query: ListLeadsQueryDto) {
    return this.leadsService.listLeads(query);
  }

  @Get('demo-excel')
  async downloadDemoExcel(
    @Res({ passthrough: true }) response: Response,
  ) {
    const { fileName, buffer } = this.leadsService.getDemoExcel();
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return new StreamableFile(buffer);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importLeads(
    @UploadedFile() file: any,
    @Body('commit') commit: string | undefined,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.leadsService.importLeads(
      file,
      commit === 'true',
      currentUser,
    );
  }

  @Get(':id/notes')
  async getLeadNotes(@Param('id') leadId: string) {
    return this.leadsService.getLeadNotes(leadId);
  }

  @Post(':id/notes')
  async addLeadNote(
    @Param('id') leadId: string,
    @Body() addLeadNoteDto: AddLeadNoteDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.leadsService.addLeadNote(leadId, addLeadNoteDto, currentUser);
  }

  @Get(':id')
  async getLead(@Param('id') leadId: string) {
    return this.leadsService.getLeadById(leadId);
  }

  @Post()
  async createLead(
    @Body() createLeadDto: CreateLeadDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.leadsService.createLead(createLeadDto, currentUser);
  }

  @Patch(':id/status')
  async updateLeadStatus(
    @Param('id') leadId: string,
    @Body() updateLeadStatusDto: UpdateLeadStatusDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.leadsService.updateLeadStatus(
      leadId,
      updateLeadStatusDto,
      currentUser,
    );
  }

  @Patch(':id')
  async updateLead(
    @Param('id') leadId: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.leadsService.updateLead(leadId, updateLeadDto, currentUser);
  }

  @Delete(':id')
  async deleteLead(@Param('id') leadId: string) {
    return this.leadsService.deleteLead(leadId);
  }
}
