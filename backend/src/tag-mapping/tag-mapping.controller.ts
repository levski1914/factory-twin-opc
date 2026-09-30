import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { TagMappingService } from './tag-mapping.service';
import type { EquipmentInput, MetricInput } from './tag-mapping.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tag-mapping')
export class TagMappingController {
  constructor(private readonly service: TagMappingService) {}

  @Post('equipment')
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN')
  saveEquipment(@CurrentUser() user: any, @Body() body: EquipmentInput) {
    return this.service.saveEquipment(user.companyId, body);
  }

  @Post('preview')
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN', 'VIEWER')
  preview(
    @CurrentUser() user: any,
    @Body() body: { integrationId: string; nodeIds: string[] },
  ) {
    return this.service.preview(
      user.companyId,
      body.integrationId,
      body.nodeIds,
    );
  }

  @Post('assets')
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN')
  createAsset(
    @CurrentUser() user: any,
    @Body()
    body: { name: string; type: string; location?: string; siteId?: string },
  ) {
    return this.service.createAsset(user.companyId, body);
  }

  @Get('assets')
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN', 'VIEWER')
  getAssets(@CurrentUser() user: any) {
    return this.service.getAssets(user.companyId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN')
  createMapping(
    @CurrentUser() user: any,
    @Body() body: MetricInput & { integrationId: string; assetId: string },
  ) {
    return this.service.createMapping(user.companyId, body);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN', 'VIEWER')
  getMappings(@CurrentUser() user: any, @Query('assetId') assetId?: string) {
    return this.service.getMappings(user.companyId, assetId);
  }
}
