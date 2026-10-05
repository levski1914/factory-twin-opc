jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../integrations/opcua/opcua.service', () => ({
  OpcuaService: class {},
}));
import { MonitoringService } from './monitoring.service';
const config = {
  enabled: true,
  runNodeId: 'run',
  runCondition: 'TRUE',
  runThreshold: 0,
  loadNodeId: 'load',
  minimumLoad: 10,
  verificationSeconds: 15,
};
const alarm = {
  name: 'Hot motor',
  nodeId: 'temp',
  tagName: 'temp',
  integrationId: 'plc',
  condition: 'GT',
  threshold: 100,
  severity: 'CRITICAL',
  delaySeconds: 10,
  clearSeconds: 5,
};
const user = {
  id: 'tech',
  email: 'engineer@test',
  role: 'TECHNICIAN',
  companyId: 'company',
};
function setup() {
  let snapshot: any = null;
  const cases: any[] = [];
  const events: any[] = [];
  const notifications: any[] = [];
  const asset = {
    id: 'motor',
    name: 'M1',
    companyId: 'company',
    updatedAt: new Date(0),
    monitoring: config,
    alarmRules: [alarm],
    tagMappings: [{ nodeId: 'temp', integrationId: 'plc' }],
  };
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    equipmentSample: { create: jest.fn() },
    asset: { findUnique: jest.fn().mockResolvedValue(asset) },
    monitorSnapshot: {
      findUnique: jest.fn(async () => snapshot),
      upsert: jest.fn(async ({ create, update }: any) => {
        snapshot = snapshot ? { ...snapshot, ...update } : create;
        return snapshot;
      }),
    },
    maintenanceCase: {
      findUnique: jest.fn(
        async ({ where }: any) =>
          cases.find((c) => c.openKey === where.openKey) ?? null,
      ),
      findFirst: jest.fn(
        async ({ where }: any) =>
          cases.find(
            (c) => c.id === where.id && c.companyId === where.companyId,
          ) ?? null,
      ),
      create: jest.fn(async ({ data }: any) => {
        const c = {
          id: 'case-' + cases.length,
          status: 'OPEN',
          assigneeId: null,
          assigneeName: null,
          reportedAt: null,
          verificationSince: null,
          failureSince: null,
          ...data,
        };
        cases.push(c);
        return c;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const index = cases.findIndex((c) => c.id === where.id);
        cases[index] = { ...cases[index], ...data };
        return cases[index];
      }),
    },
    maintenanceEvent: {
      create: jest.fn(async ({ data }: any) => {
        events.push(data);
        return data;
      }),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([{ id: 'owner' }, { id: 'tech' }]),
    },
    monitorNotification: {
      createMany: jest.fn(async ({ data }: any) => {
        notifications.push(...data);
      }),
    },
  };
  const prisma = {
    ...tx,
    integration: {
      findFirst: jest.fn().mockResolvedValue({ endpointUrl: 'opc.tcp://test' }),
    },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const opcua = { readNodes: jest.fn() };
  const service = new MonitoringService(prisma as any, opcua as any);
  async function sample(time: number, temp: number, load = 80, good = true) {
    jest.setSystemTime(time);
    opcua.readNodes.mockResolvedValue([
      { nodeId: 'temp', value: temp, good },
      { nodeId: 'run', value: true, good },
      { nodeId: 'load', value: load, good },
    ]);
    await (service as any).sample(asset, config);
  }
  return { service, sample, cases, events, notifications, tx, prisma };
}
describe('Backend maintenance lifecycle with simulated PLC readings', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it('suppresses spikes, creates one task, rejects a failed repair then verifies recovery', async () => {
    const s = setup();
    await s.sample(1000, 120);
    await s.sample(2000, 80);
    expect(s.cases).toHaveLength(0);
    expect(s.notifications).toHaveLength(0);
    for (let t = 3000; t <= 13000; t += 1000) await s.sample(t, 120);
    expect(s.cases).toHaveLength(1);
    expect(s.events[0].kind).toBe('CONFIRMED');
    expect(s.notifications).toHaveLength(2);
    expect(s.tx.equipmentSample.create).toHaveBeenCalled();
    expect(s.tx.equipmentSample.create.mock.calls.at(-1)[0].data).toMatchObject(
      { assetId: 'motor', companyId: 'company', severity: 'CRITICAL' },
    );
    await s.service.action(user, 'case-0', { action: 'CLAIM' });
    await s.service.action(user, 'case-0', {
      action: 'REPORT',
      repairAction: 'REPAIRED',
      note: 'Cooling fan checked',
    });
    expect(s.cases[0].status).toBe('VERIFYING');
    for (let t = 14000; t <= 24000; t += 1000) await s.sample(t, 120);
    expect(s.cases[0].status).toBe('VERIFICATION_FAILED');
    expect(s.events.some((e) => e.kind === 'VERIFICATION_FAILED')).toBe(true);
    expect(s.cases).toHaveLength(1);
    await s.service.action(user, 'case-0', {
      action: 'REPORT',
      repairAction: 'REPAIRED',
      note: 'Cooling fan replaced',
    });
    for (let t = 25000; t <= 32000; t += 1000) await s.sample(t, 80, 0);
    expect(s.cases[0].status).toBe('VERIFYING');
    expect(s.cases[0].verificationSince).toBeNull();
    for (let t = 33000; t <= 48000; t += 1000) await s.sample(t, 80, 80);
    expect(s.cases[0].status).toBe('RESOLVED');
    expect(s.cases[0].openKey).toBeNull();
    expect(s.events.at(-1).kind).toBe('VERIFIED');
    expect(
      s.events.find((e) => e.kind === 'REPAIR_REPORTED').evidence.snapshot,
    ).toBeTruthy();
  });
  it('treats repeated acceptance as one transition but allows resuming failed repairs', async () => {
    const s = setup();
    for (let t = 1000; t <= 11000; t += 1000) await s.sample(t, 120);
    await s.service.action(user, 'case-0', { action: 'CLAIM' });
    const count = s.notifications.length;
    for (let i = 0; i < 5; i++)
      await s.service.action(user, 'case-0', { action: 'CLAIM' });
    expect(s.events.filter((e) => e.kind === 'CLAIMED')).toHaveLength(1);
    expect(s.notifications).toHaveLength(count);
    s.cases[0].status = 'VERIFICATION_FAILED';
    await s.service.action(user, 'case-0', { action: 'CLAIM' });
    expect(s.cases[0].status).toBe('IN_PROGRESS');
    expect(s.events.filter((e) => e.kind === 'CLAIMED')).toHaveLength(2);
  });
  it('scopes task actions to the company and assigned engineer', async () => {
    const s = setup();
    for (let t = 1000; t <= 11000; t += 1000) await s.sample(t, 120);
    await expect(
      s.service.action({ ...user, companyId: 'other' }, 'case-0', {
        action: 'CLAIM',
      }),
    ).rejects.toThrow('Task not found');
    await s.service.action(user, 'case-0', { action: 'CLAIM' });
    await expect(
      s.service.action({ ...user, id: 'other-tech' }, 'case-0', {
        action: 'REPORT',
        note: 'All fixed',
        repairAction: 'REPAIRED',
      }),
    ).rejects.toThrow('assigned to another engineer');
  });
  it('does not confirm a fault across a long collection gap', async () => {
    const s = setup();
    await s.sample(1000, 120);
    await s.sample(20000, 120);
    expect(s.cases).toHaveLength(0);
  });
});
