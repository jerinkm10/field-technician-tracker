import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PostLocationDto } from './dto/post-location.dto';
import { TrackingService } from './tracking.service';

@Controller('tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TECHNICIAN)
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('location')
  async postLocation(
    @CurrentUser() currentUser: JwtPayload,
    @Body() postLocationDto: PostLocationDto,
  ) {
    return this.trackingService.saveLocation(currentUser.sub, postLocationDto);
  }
}
