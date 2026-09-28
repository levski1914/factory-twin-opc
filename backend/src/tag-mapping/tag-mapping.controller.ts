import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TagMappingService } from './tag-mapping.service';

@Controller('tag-mapping')
export class TagMappingController {
  constructor(private readonly tagMappingService: TagMappingService) {}

  @Post('assets')
  createAsset(
    @Body()
    body: {
      name: string;
      type: string;
      location?: string;
    },
  ) {
    return this.tagMappingService.createAsset(body);
  }

  @Get('assets')
  getAssets() {
    return this.tagMappingService.getAssets();
  }

  @Post()
  createMapping(
    @Body()
    body: {
      integrationId: string;
      assetId: string;
      tagName: string;
      nodeId: string;
      role: string;
      unit?: string;
      displaySlot?: number;
      showAsMetric?: boolean;
      showInTrend?: boolean;
      useInHealth?: boolean;
      useInAlarms?: boolean;
    },
  ) {
    return this.tagMappingService.createMapping(body);
  }

  @Get()
  getMappings(@Query('assetId') assetId?: string) {
    return this.tagMappingService.getMappings(assetId);
  }
}
