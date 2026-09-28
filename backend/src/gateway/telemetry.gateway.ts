import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SimulatorService } from '../simulator/simulator.service';
import { AssetIntelligenceService } from '../simulator/asset-intelligence.service';
import { PrismaService } from '../prisma/prisma.service';
import { AlarmsService } from 'src/alarms/alarms.service';
import { OpcuaService } from 'src/integrations/opcua/opcua.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TelemetryGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;
  private lastDbSaveAt = 0;
  constructor(
    private readonly simulatorService: SimulatorService,
    private readonly intelligenceService: AssetIntelligenceService,
    private readonly prisma: PrismaService,
    private readonly opcuaService: OpcuaService,
    private readonly alarmsService: AlarmsService,
  ) {}

  afterInit() {
    setInterval(async () => {
      const assets = await this.opcuaService.readMotor(
        'opc.tcp://192.168.11.10:4840',
      );
      const now = Date.now();

      const shouldSaveToDb = now - this.lastDbSaveAt >= 10_000;

      for (const [assetId, values] of Object.entries(assets)) {
        const analysis = this.intelligenceService.analyze(assetId, values);

        const payload = {
          ...analysis,
          timestamp: new Date().toISOString(),
        };

        this.server.emit('telemetry', payload);

        if (analysis.alarms.length > 0) {
          await this.alarmsService.syncAssetAlarms(assetId, analysis.alarms);

          this.server.emit('alarm', {
            assetId,
            alarms: analysis.alarms,
            timestamp: payload.timestamp,
          });
        }

        if (shouldSaveToDb) {
          await this.prisma.telemetry.create({
            data: {
              assetId,
              status: analysis.status,
              healthScore: analysis.healthScore,
              payload,
            },
          });
        }
      }

      if (shouldSaveToDb) {
        this.lastDbSaveAt = now;
      }
    }, 2000);
  }
}
