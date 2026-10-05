import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { HistoryService } from './history.service';
@Controller('history')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN', 'TECHNICIAN', 'VIEWER')
export class HistoryController {
  constructor(private history: HistoryService) {}
  @Get(':id/days') days(
    @CurrentUser() u: any,
    @Param('id') id: string,
    @Query('before') before?: string,
  ) {
    return this.history.days(u, id, before);
  }
  @Get(':id/detail') detail(
    @CurrentUser() u: any,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.history.detail(u, id, from, to);
  }
  @Get(':id/raw') raw(
    @CurrentUser() u: any,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('after') after?: string,
  ) {
    return this.history.raw(u, id, from, to, after);
  }
}
