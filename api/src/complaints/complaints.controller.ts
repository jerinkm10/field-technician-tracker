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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ListComplaintsQueryDto } from './dto/list-complaints-query.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';

@Controller('complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async listComplaints(
    @Query() query: ListComplaintsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.complaintsService.listComplaints(query, currentUser);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async getComplaint(
    @Param('id') complaintId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.complaintsService.getComplaintById(complaintId, currentUser);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async createComplaint(
    @Body() createComplaintDto: CreateComplaintDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.complaintsService.createComplaint(
      createComplaintDto,
      currentUser,
    );
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async updateComplaint(
    @Param('id') complaintId: string,
    @Body() updateComplaintDto: UpdateComplaintDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.complaintsService.updateComplaint(
      complaintId,
      updateComplaintDto,
      currentUser,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
  async deleteComplaint(@Param('id') complaintId: string) {
    return this.complaintsService.deleteComplaint(complaintId);
  }

  @Post(':id/convert-to-customer')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
  async convertToCustomer(@Param('id') complaintId: string) {
    return this.complaintsService.convertToCustomer(complaintId);
  }

  @Post(':id/convert-to-job')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
  async convertToJob(@Param('id') complaintId: string) {
    return this.complaintsService.convertToJob(complaintId);
  }
}
