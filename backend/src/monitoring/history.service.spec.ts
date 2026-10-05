jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
import { HistoryService, historyRange } from './history.service';
const from = '2026-10-05T00:00:00Z',
  to = '2026-10-06T00:00:00Z';
function setup(found = true) {
  const prisma: any = {
    asset: {
      findFirst: jest
        .fn()
        .mockResolvedValue(found ? { id: 'a', name: 'Motor' } : null),
    },
    equipmentSample: { findMany: jest.fn().mockResolvedValue([]) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  return { prisma, service: new HistoryService(prisma) };
}
describe('History boundaries', () => {
  it('accepts a UTC day and rejects invalid or oversized ranges', () => {
    expect(+historyRange(from, to).end - +historyRange(from, to).start).toBe(
      86400000,
    );
    for (const [a, b] of [
      ['bad', to],
      [to, from],
      [from, '2026-10-07T00:00:00Z'],
    ])
      expect(() => historyRange(a, b)).toThrow();
  });
  it('rejects companyless users before querying', async () => {
    const { service, prisma } = setup();
    await expect(service.days({}, 'a')).rejects.toThrow();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
  it('rejects foreign equipment for every history path', async () => {
    const { service, prisma } = setup(false);
    for (const promise of [
      service.days({ companyId: 'b' }, 'a'),
      service.detail({ companyId: 'b' }, 'a', from, to),
      service.raw({ companyId: 'b' }, 'a', from, to),
    ])
      await expect(promise).rejects.toThrow('Equipment not found');
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.equipmentSample.findMany).not.toHaveBeenCalled();
  });
  it('scopes raw exports and rejects cursors outside the range', async () => {
    const { service, prisma } = setup();
    await service.raw({ companyId: 'c' }, 'a', from, to);
    expect(
      prisma.equipmentSample.findMany.mock.calls[0][0].where,
    ).toMatchObject({ assetId: 'a', companyId: 'c' });
    await expect(
      service.raw({ companyId: 'c' }, 'a', from, to, to),
    ).rejects.toThrow('Invalid sample cursor');
  });
  it('paginates without dropping the lookahead row', async () => {
    const { service, prisma } = setup();
    const rows = Array.from({ length: 1001 }, (_, i) => ({
      sampledAt: new Date(+new Date(from) + i * 1000),
    }));
    prisma.equipmentSample.findMany.mockResolvedValue(rows);
    const result = await service.raw({ companyId: 'c' }, 'a', from, to);
    expect(result.rows).toHaveLength(1000);
    expect(result.nextAfter).toBe(rows[999].sampledAt.toISOString());
  });
});
