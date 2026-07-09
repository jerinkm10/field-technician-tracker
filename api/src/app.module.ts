import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TechniciansModule } from './technicians/technicians.module';
import { JobsModule } from './jobs/jobs.module';
import { TrackingModule } from './tracking/tracking.module';
import { ReportsModule } from './reports/reports.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { InvoicesModule } from './invoices/invoices.module';
import { CustomersModule } from './customers/customers.module';
import { ProformaInvoicesModule } from './proforma-invoices/proforma-invoices.module';
import { TaxInvoicesModule } from './tax-invoices/tax-invoices.module';
import { QuotationsModule } from './quotations/quotations.module';
import { InvoiceInputFieldsModule } from './invoice-input-fields/invoice-input-fields.module';
import { CompanySettingsModule } from './company-settings/company-settings.module';
import { ProductServicesModule } from './product-services/product-services.module';
import { OutstandingsModule } from './outstandings/outstandings.module';
import { AmcModule } from './amc/amc.module';
import { LedgerModule } from './ledger/ledger.module';
import { LeadsModule } from './leads/leads.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmployeeTasksModule } from './employee-tasks/employee-tasks.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TechniciansModule,
    JobsModule,
    TrackingModule,
    ReportsModule,
    SuppliersModule,
    CustomersModule,
    InvoicesModule,
    ProformaInvoicesModule,
    TaxInvoicesModule,
    QuotationsModule,
    InvoiceInputFieldsModule,
    CompanySettingsModule,
    ProductServicesModule,
    OutstandingsModule,
    AmcModule,
    LedgerModule,
    LeadsModule,
    DashboardModule,
    NotificationsModule,
    EmployeeTasksModule,
    ComplaintsModule,
    AttendanceModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
