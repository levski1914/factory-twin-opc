import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagMappingService {
  constructor(private readonly prisma: PrismaService) {}

  createAsset(data: { name: string; type: string; location?: string }) {
    return this.prisma.asset.create({ data });
  }

  getAssets() {
    return this.prisma.asset.findMany({
      include: {
        tagMappings: true,
      },
    });
  }

  createMapping(data: {
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
  }) {
    return this.prisma.tagMapping.create({ data });
  }

  getMappings(assetId?: string) {
    return this.prisma.tagMapping.findMany({
      where: assetId ? { assetId } : {},
      include: {
        asset: true,
        integration: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
