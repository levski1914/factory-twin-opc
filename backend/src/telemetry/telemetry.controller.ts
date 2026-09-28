import { Controller, Get, Param, Query } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}
  @Get(':assetId/history')
  async getHistory(
    @Param('assetId') assetId: string,
    @Query('minutes') minutes = '60',
  ) {
    return this.telemetryService.getHistory(assetId, Number(minutes));
  }
}
