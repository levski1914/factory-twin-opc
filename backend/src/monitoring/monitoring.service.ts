import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OpcuaService } from '../integrations/opcua/opcua.service';
import { Prisma } from '../generated/prisma/client';
import type { AlarmRule } from '../tag-mapping/alarm-rules';
import {
  advanceRule,
  operating,
  verificationStep,
  type MonitoringConfig,
  type Reading,
  type RuleState,
} from './monitor-engine';
type User = {
  id: string;
  companyId?: string;
  role: string;
  name?: string;
  email: string;
};
type Snapshot = {
  sampleAt: number;
  configKey: string;
  readings: Reading[];
  rules: RuleState[];
  operating: boolean | null;
  verification: string;
  error: string | null;
  criteria: { alarms: AlarmRule[]; monitoring: MonitoringConfig };
};
const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const MAX_GAP = 5000;
@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private logger = new Logger(MonitoringService.name);
  constructor(
    private prisma: PrismaService,
    private opcua: OpcuaService,
  ) {}
  onModuleInit() {
    if (process.env.DISABLE_EQUIPMENT_MONITOR !== 'true')
      this.timer = setTimeout(() => void this.cycle(), 1000);
  }
  onModuleDestroy() {
    this.stopped = true;
    clearTimeout(this.timer);
  }
  private company(user: User) {
    if (!user.companyId)
      throw new ForbiddenException('Company account required');
    return user.companyId;
  }
  async cycle() {
    try {
      const assets = await this.prisma.asset.findMany({
        where: { companyId: { not: null } },
        include: { tagMappings: true },
      });
      // Each cycle completes before the next starts. The database serializes state changes across API instances.
      for (const asset of assets) {
        if (this.stopped) break;
        const config = asset.monitoring as unknown as MonitoringConfig;
        if (!config?.enabled) continue;
        try {
          await this.sample(asset, config);
        } catch (error) {
          this.logger.warn(
            `Monitor ${asset.id}: ${error instanceof Error ? error.message : 'failed'}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        error instanceof Error ? error.message : 'Monitoring cycle failed',
      );
    } finally {
      if (!this.stopped) this.timer = setTimeout(() => void this.cycle(), 1000);
    }
  }
  private async sample(
    asset: {
      id: string;
      name: string;
      companyId: string | null;
      monitoring: unknown;
      passport?: unknown;
      alarmRules: unknown;
      updatedAt: Date;
      tagMappings: Array<{ nodeId: string; integrationId: string }>;
    },
    config: MonitoringConfig,
  ) {
    const rules = asset.alarmRules as AlarmRule[];
    const integrationId = asset.tagMappings[0]?.integrationId;
    if (!integrationId || !asset.companyId) return;
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, companyId: asset.companyId },
    });
    if (!integration) return;
    const ids = [
      ...new Set([
        ...asset.tagMappings.map((m) => m.nodeId),
        ...rules.map((r) => r.nodeId),
        config.runNodeId,
        config.loadNodeId,
      ]),
    ];
    let readings: Reading[] = [];
    let error: string | null = null;
    const requestedAt = Date.now();
    try {
      readings = await this.opcua.readNodes(integration.endpointUrl, ids);
    } catch (reason) {
      error = reason instanceof Error ? reason.message : 'PLC unavailable';
    }
    const now = Date.now();
    if (now - requestedAt > MAX_GAP) {
      readings = readings.map((r) => ({ ...r, good: false }));
      error = 'PLC sample took too long; continuity restarted';
    }
    const configKey = createHash('sha256')
      .update(JSON.stringify([rules, config, integrationId]))
      .digest('hex');
    await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${asset.id}))`;
        const current = await tx.asset.findUnique({ where: { id: asset.id } });
        if (
          !current ||
          current.updatedAt.getTime() !== asset.updatedAt.getTime()
        )
          return;
        const stored = await tx.monitorSnapshot.findUnique({
          where: { assetId: asset.id },
        });
        const previous = stored?.payload as unknown as Snapshot | undefined;
        if (previous && previous.sampleAt >= requestedAt) return; // Ignore overlapping/older samples.
        const continuous = Boolean(
          previous &&
          previous.configKey === configKey &&
          now - previous.sampleAt <= MAX_GAP &&
          now > previous.sampleAt,
        );
        const states = rules.map((r, index) =>
          advanceRule(
            r,
            String(index),
            readings.find((v) => v.nodeId === r.nodeId),
            previous?.configKey === configKey
              ? previous.rules.find((v) => v.key === String(index))
              : undefined,
            now,
            continuous,
          ),
        );
        const payload: Snapshot = {
          sampleAt: now,
          configKey,
          readings,
          rules: states,
          operating: operating(config, readings),
          verification: '',
          criteria: { alarms: rules, monitoring: config },
          error,
        };
        let task = await tx.maintenanceCase.findUnique({
          where: { openKey: asset.id },
        });
        const active = states.filter((r) => r.state === 'ACTIVE');
        if (!task && active.length) {
          task = await tx.maintenanceCase.create({
            data: {
              assetId: asset.id,
              companyId: asset.companyId!,
              openKey: asset.id,
              assetName: asset.name,
              severity: active.some((r) => r.severity === 'CRITICAL')
                ? 'CRITICAL'
                : 'WARNING',
            },
          });
          await this.event(
            tx,
            task,
            'CONFIRMED',
            `${asset.name}: confirmed alarm (${active.map((r) => r.name).join(', ')}). Awaiting engineer action.`,
            payload,
            true,
          );
        }
        if (
          task &&
          active.some((r) => r.severity === 'CRITICAL') &&
          task.severity !== 'CRITICAL'
        ) {
          task = await tx.maintenanceCase.update({
            where: { id: task.id },
            data: { severity: 'CRITICAL' },
          });
          await this.event(
            tx,
            task,
            'ESCALATED',
            `${asset.name}: severity increased to CRITICAL.`,
            payload,
            true,
          );
        }
        if (task?.status === 'VERIFYING') {
          const result = verificationStep({
            now,
            continuous:
              continuous &&
              Boolean(
                previous &&
                task.reportedAt &&
                previous.sampleAt >= task.reportedAt.getTime(),
              ),
            operating: payload.operating,
            rules: states,
            since: task.verificationSince?.getTime() ?? null,
            failureSince: task.failureSince?.getTime() ?? null,
            seconds: config.verificationSeconds,
          });
          payload.verification = result.result;
          task = await tx.maintenanceCase.update({
            where: { id: task.id },
            data: {
              verificationSince:
                result.since === null ? null : new Date(result.since),
              failureSince:
                result.failureSince === null
                  ? null
                  : new Date(result.failureSince),
              ...(result.result === 'PASSED'
                ? {
                    status: 'RESOLVED',
                    openKey: null,
                    resolvedAt: new Date(now),
                  }
                : result.result === 'FAILED'
                  ? { status: 'VERIFICATION_FAILED' }
                  : {}),
            },
          });
          if (result.result === 'PASSED')
            await this.event(
              tx,
              task,
              'VERIFIED',
              `${asset.name}: monitoring criteria passed for ${config.verificationSeconds}s while running under configured load. Report by ${task.reportedName}.`,
              payload,
              true,
            );
          if (result.result === 'FAILED')
            await this.event(
              tx,
              task,
              'VERIFICATION_FAILED',
              `${asset.name}: repair reported by ${task.reportedName} is not confirmed. Alarm remains active during operation under load. Supervisor review required.`,
              payload,
              true,
            );
        }
        await tx.equipmentSample.create({
          data: {
            assetId: asset.id,
            companyId: asset.companyId!,
            sampledAt: new Date(now),
            severity: states.some((r) => r.latched && r.severity === 'CRITICAL')
              ? 'CRITICAL'
              : states.some((r) => r.latched)
                ? 'WARNING'
                : 'NONE',
            hasBadData:
              Boolean(error) ||
              readings.some((r) => !r.good || r.value == null) ||
              ids.some((id) => !readings.some((r) => r.nodeId === id)),
            payload: json({
              ...payload,
              assetName: asset.name,
              passport: asset.passport ?? {},
              mappings: asset.tagMappings,
            }),
          },
        });
        await tx.monitorSnapshot.upsert({
          where: { assetId: asset.id },
          create: {
            assetId: asset.id,
            companyId: asset.companyId!,
            payload: json(payload),
          },
          update: { payload: json(payload) },
        });
      },
      { timeout: 10000 },
    );
  }
  private async event(
    tx: Prisma.TransactionClient,
    task: { id: string; companyId: string; assigneeId: string | null },
    kind: string,
    message: string,
    evidence: unknown,
    notify = false,
  ) {
    await tx.maintenanceEvent.create({
      data: {
        caseId: task.id,
        companyId: task.companyId,
        kind,
        message,
        evidence: json(evidence),
      },
    });
    if (notify) {
      const recipients = await tx.user.findMany({
        where: {
          companyId: task.companyId,
          OR: [
            {
              role: {
                in:
                  kind === 'CONFIRMED'
                    ? ['OWNER', 'ADMIN', 'TECHNICIAN']
                    : ['OWNER', 'ADMIN'],
              },
            },
            ...(task.assigneeId ? [{ id: task.assigneeId }] : []),
          ],
        },
        select: { id: true },
      });
      if (recipients.length)
        await tx.monitorNotification.createMany({
          data: recipients.map((user) => ({
            companyId: task.companyId,
            userId: user.id,
            caseId: task.id,
            message,
          })),
        });
    }
  }
  async overview(user: User) {
    const companyId = this.company(user);
    const [snapshots, cases, notifications] = await Promise.all([
      this.prisma.monitorSnapshot.findMany({ where: { companyId } }),
      this.prisma.maintenanceCase.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.monitorNotification.findMany({
        where: { companyId, userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    const now = Date.now();
    return {
      serverTime: now,
      snapshots: snapshots.map((s) => ({
        assetId: s.assetId,
        ...(s.payload as object),
        stale: now - (s.payload as unknown as Snapshot).sampleAt > MAX_GAP,
      })),
      cases,
      notifications,
    };
  }
  async detail(user: User, id: string) {
    const task = await this.prisma.maintenanceCase.findFirst({
      where: { id, companyId: this.company(user) },
    });
    if (!task) throw new NotFoundException('Task not found');
    return {
      task,
      events: await this.prisma.maintenanceEvent.findMany({
        where: { caseId: id, companyId: task.companyId },
        orderBy: { createdAt: 'asc' },
        take: 200,
      }),
    };
  }
  async action(
    user: User,
    id: string,
    body: { action?: string; note?: string; repairAction?: string },
  ) {
    const companyId = this.company(user);
    const found = await this.prisma.maintenanceCase.findFirst({
      where: { id, companyId },
    });
    if (!found) throw new NotFoundException('Task not found');
    if (!body || !['CLAIM', 'REPORT'].includes(body.action ?? ''))
      throw new BadRequestException('Choose CLAIM or REPORT');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${found.assetId}))`;
      const task = await tx.maintenanceCase.findFirst({
        where: { id, companyId },
      });
      if (!task || task.status === 'RESOLVED')
        throw new ConflictException('Task is already closed');
      const supervisor = ['OWNER', 'ADMIN'].includes(user.role);
      if (task.assigneeId && task.assigneeId !== user.id && !supervisor)
        throw new ForbiddenException(
          'This task is assigned to another engineer',
        );
      const name = user.name || user.email;
      if (body.action === 'CLAIM') {
        if (task.status === 'VERIFYING')
          throw new ConflictException('Verification is in progress');
        // Repeated clicks and retried requests must not create new events.
        // This check runs under the same asset lock as the state transition.
        if (task.status === 'IN_PROGRESS' && task.assigneeId === user.id)
          return task;
        const updated = await tx.maintenanceCase.update({
          where: { id },
          data: {
            status: 'IN_PROGRESS',
            assigneeId: user.id,
            assigneeName: name,
          },
        });
        await this.event(
          tx,
          updated,
          'CLAIMED',
          `${task.assetName}: ${name} accepted responsibility for the repair.`,
          { actorId: user.id },
          true,
        );
        return updated;
      }
      if (task.status === 'VERIFYING')
        throw new ConflictException('Verification is already in progress');
      if (
        typeof body.note !== 'string' ||
        body.note.trim().length < 5 ||
        body.note.length > 2000 ||
        !['REPAIRED', 'REPLACED'].includes(body.repairAction ?? '')
      )
        throw new BadRequestException(
          'Describe the repair (5–2000 characters) and choose repaired or replaced',
        );
      const updated = await tx.maintenanceCase.update({
        where: { id },
        data: {
          status: 'VERIFYING',
          assigneeId: task.assigneeId ?? user.id,
          assigneeName: task.assigneeName ?? name,
          reportedBy: user.id,
          reportedName: name,
          reportNote: body.note.trim(),
          repairAction: body.repairAction,
          reportedAt: new Date(),
          verificationSince: null,
          failureSince: null,
        },
      });
      await this.event(
        tx,
        updated,
        'REPAIR_REPORTED',
        `${name} reported ${body.repairAction}: ${body.note.trim()}. Awaiting measurements under load.`,
        {
          actorId: user.id,
          snapshot:
            (
              await tx.monitorSnapshot.findUnique({
                where: { assetId: task.assetId },
              })
            )?.payload ?? null,
        },
        true,
      );
      return updated;
    });
  }
  async markRead(user: User, id: string) {
    return this.prisma.monitorNotification.updateMany({
      where: { id, companyId: this.company(user), userId: user.id },
      data: { readAt: new Date() },
    });
  }
}
