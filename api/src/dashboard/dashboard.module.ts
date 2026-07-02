import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmployeeTasksModule } from '../employee-tasks/employee-tasks.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuthModule, EmployeeTasksModule, PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
