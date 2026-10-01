jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('./opcua/opcua.service', () => ({ OpcuaService: class {} }));
import { IntegrationsController } from './integrations.controller';
describe('Integration deletion', () => {
  function setup() {
    const tx = {
      integration: {
        findFirst: jest.fn().mockResolvedValue({ id: 'plc-a' }),
        delete: jest.fn(),
      },
      tagMapping: { count: jest.fn().mockResolvedValue(0) },
      asset: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
    };
    const controller = new IntegrationsController({} as any, prisma as any);
    return { controller, tx, prisma };
  }
  it('deletes unused integrations scoped to the company', async () => {
    const { controller, tx } = setup();
    await expect(
      controller.remove('plc-a', { companyId: 'company-a' }),
    ).resolves.toEqual({ ok: true });
    expect(tx.integration.findFirst).toHaveBeenCalledWith({
      where: { id: 'plc-a', companyId: 'company-a' },
    });
    expect(tx.integration.delete).toHaveBeenCalledWith({
      where: { id: 'plc-a' },
    });
  });
  it('cannot delete another company integration', async () => {
    const { controller, tx } = setup();
    tx.integration.findFirst.mockResolvedValue(null);
    await expect(
      controller.remove('foreign', { companyId: 'company-a' }),
    ).rejects.toThrow('Integration not found');
    expect(tx.integration.delete).not.toHaveBeenCalled();
  });
  it('blocks deletion of a PLC with metric mappings', async () => {
    const { controller, tx } = setup();
    tx.tagMapping.count.mockResolvedValue(1);
    await expect(
      controller.remove('plc-a', { companyId: 'company-a' }),
    ).rejects.toThrow('used by equipment');
    expect(tx.integration.delete).not.toHaveBeenCalled();
  });
  it('blocks deletion of a PLC referenced only by an alarm', async () => {
    const { controller, tx } = setup();
    tx.asset.findMany.mockResolvedValue([
      { alarmRules: [{ integrationId: 'plc-a' }] },
    ]);
    await expect(
      controller.remove('plc-a', { companyId: 'company-a' }),
    ).rejects.toThrow('used by equipment');
    expect(tx.integration.delete).not.toHaveBeenCalled();
  });
  it('reports a concurrent binding as a conflict', async () => {
    const { controller, prisma } = setup();
    prisma.$transaction.mockRejectedValue({ code: 'P2003' });
    await expect(
      controller.remove('plc-a', { companyId: 'company-a' }),
    ).rejects.toThrow('in use');
  });
});
