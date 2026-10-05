import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export function historyRange(from?: string, to?: string) {
  const start = new Date(from ?? '');
  const end = new Date(to ?? '');
  if (
    !Number.isFinite(+start) ||
    !Number.isFinite(+end) ||
    +end <= +start ||
    +end - +start > 86400000
  )
    throw new BadRequestException('Choose a valid range of up to 24 hours');
  return { start, end };
}
@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}
  private async asset(user: { companyId?: string }, id: string) {
    if (!user.companyId)
      throw new ForbiddenException('Company account required');
    const asset = await this.prisma.asset.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!asset) throw new NotFoundException('Equipment not found');
    return asset;
  }
  async days(user: { companyId?: string }, id: string, before?: string) {
    await this.asset(user, id);
    const boundary = before ? new Date(before) : new Date();
    if (!Number.isFinite(+boundary))
      throw new BadRequestException('Invalid day cursor');
    const days = await this.prisma.$queryRaw<
      Array<{
        day: string;
        samples: number;
        first: Date;
        last: Date;
        critical: boolean;
        warning: boolean;
        bad: number;
        gaps: number;
      }>
    >`
      WITH s AS (SELECT *, LAG("sampledAt") OVER (ORDER BY "sampledAt") AS previous
        FROM "EquipmentSample" WHERE "assetId"=${id} AND "companyId"=${user.companyId!} AND "sampledAt" < ${boundary})
      SELECT to_char("sampledAt", 'YYYY-MM-DD') AS day, COUNT(*)::int AS samples,
        MIN("sampledAt") AS first, MAX("sampledAt") AS last,
        bool_or(severity='CRITICAL') AS critical, bool_or(severity='WARNING') AS warning,
        COUNT(*) FILTER (WHERE "hasBadData")::int AS bad,
        COUNT(*) FILTER (WHERE "sampledAt" - previous > interval '5 seconds')::int AS gaps
      FROM s GROUP BY day ORDER BY day DESC LIMIT 31`;
    return {
      days: days.slice(0, 30),
      nextBefore: days.length > 30 ? days[29].day + 'T00:00:00.000Z' : null,
    };
  }
  async detail(
    user: { companyId?: string },
    id: string,
    from?: string,
    to?: string,
  ) {
    const asset = await this.asset(user, id);
    const { start, end } = historyRange(from, to);
    const where = {
      assetId: id,
      companyId: user.companyId!,
      sampledAt: { gte: start, lt: end },
    };
    const count = await this.prisma.equipmentSample.count({ where });
    const bucketSeconds = Math.max(1, Math.ceil((+end - +start) / 1000 / 1800));
    const samples = await this.prisma.$queryRaw<
      Array<{
        id: string;
        sampledAt: Date;
        payload: unknown;
        hasBadData: boolean;
      }>
    >`
      SELECT DISTINCT ON (floor(extract(epoch FROM "sampledAt") / ${bucketSeconds}))
        id, "sampledAt", payload, "hasBadData"
      FROM "EquipmentSample" WHERE "assetId"=${id} AND "companyId"=${user.companyId!}
        AND "sampledAt">=${start} AND "sampledAt"<${end}
      ORDER BY floor(extract(epoch FROM "sampledAt") / ${bucketSeconds}), "sampledAt" DESC`;
    const events = await this.prisma.maintenanceEvent.findMany({
      where: {
        companyId: user.companyId!,
        createdAt: { gte: start, lt: end },
        caseId: {
          in: (
            await this.prisma.maintenanceCase.findMany({
              where: { assetId: id, companyId: user.companyId! },
              select: { id: true },
            })
          ).map((c) => c.id),
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 2001,
    });
    return {
      asset: { id: asset.id, name: asset.name },
      from: start,
      to: end,
      count,
      bucketSeconds,
      samples,
      events: events.slice(0, 2000),
      eventsTruncated: events.length > 2000,
    };
  }
  async raw(
    user: { companyId?: string },
    id: string,
    from?: string,
    to?: string,
    after?: string,
  ) {
    await this.asset(user, id);
    const { start, end } = historyRange(from, to);
    const cursor = after ? new Date(after) : null;
    if (
      cursor &&
      (!Number.isFinite(+cursor) || +cursor < +start || +cursor >= +end)
    )
      throw new BadRequestException('Invalid sample cursor');
    const rows = await this.prisma.equipmentSample.findMany({
      where: {
        assetId: id,
        companyId: user.companyId!,
        sampledAt: { gte: start, lt: end, ...(cursor ? { gt: cursor } : {}) },
      },
      orderBy: { sampledAt: 'asc' },
      take: 1001,
    });
    return {
      rows: rows.slice(0, 1000),
      nextAfter: rows.length > 1000 ? rows[999].sampledAt.toISOString() : null,
    };
  }
}
