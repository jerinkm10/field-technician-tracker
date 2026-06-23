import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OutstandingsController } from './outstandings.controller';
import { OutstandingsService } from './outstandings.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [OutstandingsController],
  providers: [OutstandingsService],
  exports: [OutstandingsService],
})
export class OutstandingsModule {}
