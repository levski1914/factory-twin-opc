import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TelemetryService {
  constructor(
    // private readonly simulatorService: SimulatorService,
    // private readonly intelligenceService: AssetIntelligenceService,
    private readonly prisma: PrismaService,
  ) {}

  async getHistory(assetId: string, minutes: number) {
    const since = new Date(Date.now() - minutes * 60 * 1000);

    const rows = await this.prisma.telemetry.findMany({
      where: {
        assetId,
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return rows.map((row) => ({
      time: row.createdAt.toLocaleTimeString('bg-BG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      ...((row.payload as any).values ?? {}),
      healthScore: row.healthScore,
      status: row.status,
    }));
  }
}
