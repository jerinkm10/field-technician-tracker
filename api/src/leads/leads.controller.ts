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
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async listLeads(
    @Query() query: ListLeadsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.leadsService.listLeads(query, currentUser);
  }

  @Get('suggestions')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async listLeadSuggestions(
    @Query('query') query: string | undefined,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.leadsService.listLeadSuggestions(query, currentUser);
  }

  @Get('performance')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
  async getLeadPerformance(
    @Query() query: ListLeadsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.leadsService.getLeadPerformance(query, currentUser);
  }

  @Get('demo-excel')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
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
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
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
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async getLeadNotes(
    @Param('id') leadId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.leadsService.getLeadNotes(leadId, currentUser);
  }

  @Post(':id/notes')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async addLeadNote(
    @Param('id') leadId: string,
    @Body() addLeadNoteDto: AddLeadNoteDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.leadsService.addLeadNote(leadId, addLeadNoteDto, currentUser);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async getLead(
    @Param('id') leadId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.leadsService.getLeadById(leadId, currentUser);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
  async createLead(
    @Body() createLeadDto: CreateLeadDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.leadsService.createLead(createLeadDto, currentUser);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
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
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
  async updateLead(
    @Param('id') leadId: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.leadsService.updateLead(leadId, updateLeadDto, currentUser);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
  async deleteLead(
    @Param('id') leadId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.leadsService.deleteLead(leadId, currentUser);
  }
}
