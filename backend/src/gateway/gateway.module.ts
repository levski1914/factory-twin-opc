import { Module } from '@nestjs/common';
import { TelemetryGateway } from './telemetry.gateway';
import { SimulatorModule } from '../simulator/simulator.module';
import { SimulatorService } from 'src/simulator/simulator.service';
import { AssetIntelligenceService } from 'src/simulator/asset-intelligence.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GatewayController } from './gateway.controller';
import { AlarmsService } from 'src/alarms/alarms.service';
import { OpcuaService } from 'src/integrations/opcua/opcua.service';

@Module({
  imports: [SimulatorModule],
  providers: [
    TelemetryGateway,
    SimulatorService,
    AssetIntelligenceService,
    PrismaService,
    AlarmsService,
    OpcuaService,
  ],
  controllers: [GatewayController],
})
export class GatewayModule {}
