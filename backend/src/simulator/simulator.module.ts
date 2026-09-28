import { Module } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { AssetIntelligenceService } from './asset-intelligence.service';

@Module({
  providers: [SimulatorService, AssetIntelligenceService],
})
export class SimulatorModule {}
