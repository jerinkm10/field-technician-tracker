import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminTrackingController } from './admin-tracking.controller';
import { TrackingController } from './tracking.controller';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';

@Module({
  imports: [AuthModule],
  controllers: [TrackingController, AdminTrackingController],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingGateway, TrackingService],
})
export class TrackingModule {}
