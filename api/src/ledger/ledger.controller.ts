import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ListLedgerQueryDto } from './dto/list-ledger-query.dto';
import { LedgerService } from './ledger.service';

@Controller('ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get()
  async listLedgerEntries(@Query() query: ListLedgerQueryDto) {
    return this.ledgerService.listLedgerEntries(query);
  }

  @Get(':id')
  async getLedgerEntry(@Param('id') ledgerEntryId: string) {
    return this.ledgerService.getLedgerEntryById(ledgerEntryId);
  }
}
