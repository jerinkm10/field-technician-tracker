import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ListOutstandingsQueryDto } from './dto/list-outstandings-query.dto';
import { UpdateOutstandingDto } from './dto/update-outstanding.dto';
import { OutstandingsService } from './outstandings.service';

@Controller('outstandings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OutstandingsController {
  constructor(private readonly outstandingsService: OutstandingsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async listOutstandings(
    @Query() query: ListOutstandingsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.outstandingsService.listOutstandings(query, currentUser);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async getOutstanding(
    @Param('id') outstandingId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.outstandingsService.getOutstandingById(
      outstandingId,
      currentUser,
    );
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER, Role.EMPLOYEE)
  async updateOutstanding(
    @Param('id') outstandingId: string,
    @Body() updateOutstandingDto: UpdateOutstandingDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.outstandingsService.updateOutstanding(
      outstandingId,
      updateOutstandingDto,
      currentUser,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.ADMIN_OWNER)
  async deleteOutstanding(
    @Param('id') outstandingId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.outstandingsService.deleteOutstanding(
      outstandingId,
      currentUser,
    );
  }
}
