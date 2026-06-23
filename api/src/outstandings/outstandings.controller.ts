import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ListOutstandingsQueryDto } from './dto/list-outstandings-query.dto';
import { UpdateOutstandingDto } from './dto/update-outstanding.dto';
import { OutstandingsService } from './outstandings.service';

@Controller('outstandings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class OutstandingsController {
  constructor(private readonly outstandingsService: OutstandingsService) {}

  @Get()
  async listOutstandings(@Query() query: ListOutstandingsQueryDto) {
    return this.outstandingsService.listOutstandings(query);
  }

  @Get(':id')
  async getOutstanding(@Param('id') outstandingId: string) {
    return this.outstandingsService.getOutstandingById(outstandingId);
  }

  @Patch(':id')
  async updateOutstanding(
    @Param('id') outstandingId: string,
    @Body() updateOutstandingDto: UpdateOutstandingDto,
  ) {
    return this.outstandingsService.updateOutstanding(
      outstandingId,
      updateOutstandingDto,
    );
  }

  @Delete(':id')
  async deleteOutstanding(@Param('id') outstandingId: string) {
    return this.outstandingsService.deleteOutstanding(outstandingId);
  }
}
