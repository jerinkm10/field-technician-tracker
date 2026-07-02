import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmployeeTasksModule } from '../employee-tasks/employee-tasks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminJobsController } from './admin-jobs.controller';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { TechnicianJobsController } from './technician-jobs.controller';

@Module({
  imports: [AuthModule, EmployeeTasksModule, NotificationsModule],
  controllers: [
    TechnicianJobsController,
    JobsController,
    AdminJobsController,
  ],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
