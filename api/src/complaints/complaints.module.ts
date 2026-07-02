import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmployeeTasksModule } from '../employee-tasks/employee-tasks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';

@Module({
  imports: [AuthModule, EmployeeTasksModule, NotificationsModule],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
