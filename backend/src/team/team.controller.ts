import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { TeamService } from './team.service';
@Controller('team')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
export class TeamController {
  constructor(private readonly team: TeamService) {}
  @Get() list(@CurrentUser() user: any) {
    return this.team.list(user);
  }
  @Post() create(@CurrentUser() user: any, @Body() body: any) {
    return this.team.create(user, body);
  }
}
