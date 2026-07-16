import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ListLedgerQueryDto } from './dto/list-ledger-query.dto';
import { LedgerService } from './ledger.service';

@Controller('ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ADMIN_OWNER)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get()
  async listLedgerEntries(
    @Query() query: ListLedgerQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.ledgerService.listLedgerEntries(query, currentUser);
  }

  @Get('suggestions')
  async listLedgerSuggestions(
    @CurrentUser() currentUser: JwtPayload,
    @Query('query') query?: string,
  ) {
    return this.ledgerService.listLedgerSuggestions(query, currentUser);
  }

  @Get(':id')
  async getLedgerEntry(
    @Param('id') ledgerEntryId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.ledgerService.getLedgerEntryById(ledgerEntryId, currentUser);
  }
}
