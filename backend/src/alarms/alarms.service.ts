import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AlarmsService {
  constructor(private prisma: PrismaService) {}

  async syncAssetAlarms(assetId: string, alarms: any[]) {
    for (const alarm of alarms) {
      const existing = await this.prisma.alarm.findFirst({
        where: {
          assetId,
          message: alarm.message,
          status: {
            in: ['OPEN', 'ACKNOWLEDGED'],
          },
        },
      });

      if (!existing) {
        await this.prisma.alarm.create({
          data: {
            assetId,
            message: alarm.message,
            severity: alarm.severity,
            status: 'OPEN',
          },
        });
      }
    }
  }

  getAll() {
    return this.prisma.alarm.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  getOpen() {
    return this.prisma.alarm.findMany({
      where: {
        status: {
          in: ['OPEN', 'ACKNOWLEDGED'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  acknowledge(id: string) {
    return this.prisma.alarm.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED' },
    });
  }

  resolve(id: string) {
    return this.prisma.alarm.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
  }
}
