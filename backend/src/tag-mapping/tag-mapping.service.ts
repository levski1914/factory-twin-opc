import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { validateAlarmRules, type AlarmRule } from './alarm-rules';
import { PrismaService } from '../prisma/prisma.service';
import { OpcuaService } from '../integrations/opcua/opcua.service';

export type MetricInput = {
  tagName: string;
  nodeId: string;
  role: string;
  label?: string;
  unit?: string;
  sourceField?: string;
  displaySlot?: number;
  showAsMetric?: boolean;
  showInTrend?: boolean;
  useInHealth?: boolean;
  useInAlarms?: boolean;
};
export type EquipmentInput = {
  id?: string;
  name: string;
  type: string;
  location?: string;
  siteId: string;
  integrationId: string;
  mappings: MetricInput[];
  alarmRules?: AlarmRule[];
};

@Injectable()
export class TagMappingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly opcua: OpcuaService,
  ) {}

  private company(companyId?: string) {
    if (!companyId)
      throw new BadRequestException('A company account is required');
    return companyId;
  }

  private async integration(companyId: string, integrationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, companyId },
    });
    if (!integration) throw new NotFoundException('Integration not found');
    return integration;
  }

  private validateMappings(mappings: MetricInput[]) {
    if (
      !Array.isArray(mappings) ||
      mappings.length < 1 ||
      mappings.length > 64
    ) {
      throw new BadRequestException('Select between 1 and 64 metrics');
    }
    const ids = new Set<string>();
    return mappings.map((item, index) => {
      if (
        !item ||
        typeof item.nodeId !== 'string' ||
        !item.nodeId.trim() ||
        item.nodeId.length > 1024 ||
        typeof item.tagName !== 'string' ||
        !item.tagName.trim() ||
        item.tagName.length > 256 ||
        typeof item.role !== 'string' ||
        !item.role.trim() ||
        item.role.length > 64 ||
        (item.label !== undefined &&
          (typeof item.label !== 'string' || item.label.length > 120)) ||
        (item.unit !== undefined &&
          (typeof item.unit !== 'string' || item.unit.length > 32))
      ) {
        throw new BadRequestException(
          'Each metric requires a valid tag, node ID and role',
        );
      }
      if (ids.has(item.nodeId))
        throw new BadRequestException('A tag can only appear once per asset');
      ids.add(item.nodeId);
      return {
        nodeId: item.nodeId,
        tagName: item.tagName.trim(),
        role: item.role.trim(),
        sourceField: item.role.trim(),
        label: item.label?.trim() || item.tagName.trim(),
        unit: item.unit?.trim() ?? '',
        displaySlot: index + 1,
        showAsMetric: true,
        showInTrend: item.showInTrend === true,
        useInHealth: false,
        useInAlarms: false,
      };
    });
  }

  async saveEquipment(companyId: string, body: EquipmentInput) {
    this.company(companyId);
    if (
      !body ||
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      body.name.length > 120 ||
      !['MOTOR', 'PUMP', 'TANK', 'VALVE', 'SHAFT', 'OTHER'].includes(
        body.type,
      ) ||
      typeof body.siteId !== 'string' ||
      typeof body.integrationId !== 'string' ||
      (body.location !== undefined &&
        (typeof body.location !== 'string' || body.location.length > 256))
    ) {
      throw new BadRequestException(
        'Provide name, equipment type, site and integration',
      );
    }
    const mappings = this.validateMappings(body.mappings);
    const alarmRules =
      body.alarmRules === undefined
        ? undefined
        : validateAlarmRules(body.alarmRules, body.integrationId);
    if (
      new Set([
        ...mappings.map((m) => m.nodeId),
        ...(alarmRules ?? []).map((r) => r.nodeId),
      ]).size > 64
    )
      throw new BadRequestException(
        'Select at most 64 distinct PLC tags across metrics and alarms',
      );
    return this.prisma.$transaction(async (tx) => {
      const site = await tx.site.findFirst({
        where: { id: body.siteId, companyId },
      });
      const integration = await tx.integration.findFirst({
        where: { id: body.integrationId, companyId, siteId: body.siteId },
      });
      if (!site || !integration)
        throw new BadRequestException(
          'Select an integration belonging to this site',
        );
      if (
        body.id &&
        !(await tx.asset.findFirst({ where: { id: body.id, companyId } }))
      ) {
        throw new NotFoundException('Asset not found');
      }
      if (body.id && alarmRules === undefined) {
        const existing = await tx.asset.findFirst({
          where: { id: body.id, companyId },
        });
        const saved = (existing?.alarmRules ?? []) as AlarmRule[];
        if (saved.some((rule) => rule.integrationId !== integration.id))
          throw new BadRequestException(
            'Rebind alarm rules before changing the PLC connection',
          );
        if (
          new Set([
            ...mappings.map((m) => m.nodeId),
            ...saved.map((r) => r.nodeId),
          ]).size > 64
        )
          throw new BadRequestException(
            'Select at most 64 distinct PLC tags across metrics and alarms',
          );
      }
      const data = {
        ...(alarmRules !== undefined ? { alarmRules } : {}),
        name: body.name.trim(),
        type: body.type,
        location: body.location?.trim() ?? '',
        siteId: site.id,
        companyId,
      };
      const asset = body.id
        ? await tx.asset.update({ where: { id: body.id }, data })
        : await tx.asset.create({ data });
      await tx.tagMapping.deleteMany({ where: { assetId: asset.id } });
      await tx.tagMapping.createMany({
        data: mappings.map((mapping) => ({
          ...mapping,
          assetId: asset.id,
          integrationId: integration.id,
        })),
      });
      return tx.asset.findUnique({
        where: { id: asset.id },
        include: {
          tagMappings: { orderBy: { displaySlot: 'asc' } },
          site: true,
        },
      });
    });
  }

  async createAsset(
    companyId: string,
    data: { name: string; type: string; location?: string; siteId?: string },
  ) {
    this.company(companyId);
    if (
      data.siteId &&
      !(await this.prisma.site.findFirst({
        where: { id: data.siteId, companyId },
      }))
    )
      throw new NotFoundException('Site not found');
    return this.prisma.asset.create({
      data: {
        name: data.name,
        type: data.type,
        location: data.location,
        siteId: data.siteId,
        companyId,
      },
    });
  }

  getAssets(companyId: string) {
    return this.prisma.asset.findMany({
      where: { companyId: this.company(companyId) },
      include: { tagMappings: { orderBy: { displaySlot: 'asc' } }, site: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMapping(
    companyId: string,
    data: MetricInput & { integrationId: string; assetId: string },
  ) {
    this.company(companyId);
    const integration = await this.integration(companyId, data.integrationId);
    const asset = await this.prisma.asset.findFirst({
      where: { id: data.assetId, companyId },
    });
    if (!asset || asset.siteId !== integration.siteId)
      throw new BadRequestException(
        'Asset and integration must belong to the same site',
      );
    const [mapping] = this.validateMappings([data]);
    return this.prisma.tagMapping.create({
      data: { ...mapping, assetId: asset.id, integrationId: integration.id },
    });
  }

  getMappings(companyId: string, assetId?: string) {
    return this.prisma.tagMapping.findMany({
      where: {
        asset: { companyId: this.company(companyId) },
        ...(assetId ? { assetId } : {}),
      },
      include: { asset: true, integration: true },
      orderBy: { displaySlot: 'asc' },
    });
  }

  async preview(companyId: string, integrationId: string, nodeIds: string[]) {
    this.company(companyId);
    if (
      !Array.isArray(nodeIds) ||
      nodeIds.length < 1 ||
      nodeIds.length > 64 ||
      nodeIds.some((id) => typeof id !== 'string' || !id || id.length > 1024)
    )
      throw new BadRequestException('Select between 1 and 64 node IDs');
    const integration = await this.integration(companyId, integrationId);
    return this.opcua.readNodes(integration.endpointUrl, [...new Set(nodeIds)]);
  }
}
