import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmployeeTasksController } from './employee-tasks.controller';
import { EmployeeTasksService } from './employee-tasks.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [EmployeeTasksController],
  providers: [EmployeeTasksService],
  exports: [EmployeeTasksService],
})
export class EmployeeTasksModule {}
