import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AttendancePunchDto } from './dto/attendance-punch.dto';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TECHNICIAN, Role.ADMIN, Role.ADMIN_OWNER)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('mine')
  async getMyAttendance(@CurrentUser() currentUser: JwtPayload) {
    return this.attendanceService.getMyAttendance(currentUser.sub);
  }

  @Post('check-in')
  async checkIn(
    @CurrentUser() currentUser: JwtPayload,
    @Body() attendancePunchDto: AttendancePunchDto,
  ) {
    return this.attendanceService.checkIn(currentUser.sub, attendancePunchDto);
  }

  @Post('check-out')
  async checkOut(
    @CurrentUser() currentUser: JwtPayload,
    @Body() attendancePunchDto: AttendancePunchDto,
  ) {
    return this.attendanceService.checkOut(currentUser.sub, attendancePunchDto);
  }
}
