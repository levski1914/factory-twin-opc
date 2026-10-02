import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MonitoringController {
  constructor(private service: MonitoringService) {}
  @Get() @Roles('OWNER', 'ADMIN', 'TECHNICIAN', 'VIEWER') overview(
    @CurrentUser() user: any,
  ) {
    return this.service.overview(user);
  }
  @Get('cases/:id') @Roles('OWNER', 'ADMIN', 'TECHNICIAN', 'VIEWER') detail(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.service.detail(user, id);
  }
  @Patch('cases/:id') @Roles('OWNER', 'ADMIN', 'TECHNICIAN') action(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.action(user, id, body);
  }
  @Patch('notifications/:id/read')
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN', 'VIEWER')
  read(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.markRead(user, id);
  }
}
