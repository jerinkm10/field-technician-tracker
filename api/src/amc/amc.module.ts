import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompanySettingsModule } from '../company-settings/company-settings.module';
import { OutstandingsModule } from '../outstandings/outstandings.module';
import { AmcController } from './amc.controller';
import { AmcService } from './amc.service';

@Module({
  imports: [AuthModule, CompanySettingsModule, OutstandingsModule],
  controllers: [AmcController],
  providers: [AmcService],
  exports: [AmcService],
})
export class AmcModule {}
