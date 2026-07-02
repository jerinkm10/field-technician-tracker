import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmployeeTasksModule } from '../employee-tasks/employee-tasks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [
    AuthModule,
    EmployeeTasksModule,
    NotificationsModule,
    PrismaModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
