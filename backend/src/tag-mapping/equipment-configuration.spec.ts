jest.mock('../integrations/opcua/opcua.service', () => ({
  OpcuaService: class {},
}));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
import { TagMappingService, EquipmentInput } from './tag-mapping.service';
import { PrismaService } from '../prisma/prisma.service';
import { OpcuaService } from '../integrations/opcua/opcua.service';

describe('Equipment ownership and configuration', () => {
  const draft: EquipmentInput = {
    name: 'Motor M205',
    type: 'MOTOR',
    siteId: 'site-a',
    integrationId: 'plc-a',
    mappings: [
      {
        nodeId: 'ns=3;s=current',
        tagName: 'Current_A',
        role: 'current',
        label: 'Load current',
        unit: 'A',
      },
    ],
  };
  function setup() {
    const tx = {
      $queryRaw: jest.fn(),
      maintenanceCase: { count: jest.fn().mockResolvedValue(0) },
      site: { findFirst: jest.fn().mockResolvedValue({ id: 'site-a' }) },
      integration: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'plc-a', siteId: 'site-a' }),
      },
      asset: {
        findFirst: jest.fn().mockResolvedValue({ id: 'asset-a' }),
        create: jest.fn().mockResolvedValue({ id: 'asset-a' }),
        update: jest.fn().mockResolvedValue({ id: 'asset-a' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'asset-a' }),
        findMany: jest.fn(),
      },
      tagMapping: { deleteMany: jest.fn(), createMany: jest.fn() },
    };
    const prisma = {
      ...tx,
      $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
    };
    const opcua = { readNodes: jest.fn() };
    const service = new TagMappingService(
      prisma as unknown as PrismaService,
      opcua as unknown as OpcuaService,
    );
    return { service, prisma, tx, opcua };
  }
  it('saves passport independently of alarm limits and preserves omitted passport on edit', async () => {
    const { service, tx } = setup();
    await service.saveEquipment('company-a', {
      ...draft,
      passport: { ratedCurrentA: 16, model: ' M1 ' },
    });
    expect(tx.asset.create.mock.calls[0][0].data.passport).toEqual({
      ratedCurrentA: 16,
      model: 'M1',
    });
    expect(tx.asset.create.mock.calls[0][0].data).not.toHaveProperty(
      'alarmRules',
    );
    await service.saveEquipment('company-a', { ...draft, id: 'asset-a' });
    expect(tx.asset.update.mock.calls[0][0].data).not.toHaveProperty(
      'passport',
    );
    await service.saveEquipment('company-a', {
      ...draft,
      id: 'asset-a',
      passport: {},
    });
    expect(tx.asset.update.mock.calls[1][0].data.passport).toEqual({});
  });
  it('rejects foreign or mismatched integrations before writing', async () => {
    const { service, tx } = setup();
    tx.integration.findFirst.mockResolvedValue(null);
    await expect(service.saveEquipment('company-a', draft)).rejects.toThrow(
      'Select an integration',
    );
    expect(tx.asset.create).not.toHaveBeenCalled();
    expect(tx.tagMapping.deleteMany).not.toHaveBeenCalled();
    expect(tx.integration.findFirst).toHaveBeenCalledWith({
      where: { id: 'plc-a', companyId: 'company-a', siteId: 'site-a' },
    });
  });
  it('rejects edits to another company equipment', async () => {
    const { service, tx } = setup();
    tx.asset.findFirst.mockResolvedValue(null);
    await expect(
      service.saveEquipment('company-a', { ...draft, id: 'foreign-asset' }),
    ).rejects.toThrow('Asset not found');
    expect(tx.asset.update).not.toHaveBeenCalled();
  });
  it('rejects duplicate tags before opening a transaction', async () => {
    const { service, prisma } = setup();
    await expect(
      service.saveEquipment('company-a', {
        ...draft,
        mappings: [draft.mappings[0], draft.mappings[0]],
      }),
    ).rejects.toThrow('A tag can only appear once');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('persists custom labels and submitted order for the real asset', async () => {
    const { service, tx } = setup();
    await service.saveEquipment('company-a', {
      ...draft,
      id: 'asset-a',
      mappings: [
        {
          nodeId: 'ns=3;s=temp',
          tagName: 'Temp_C',
          role: 'temperature',
          label: 'Bearing temperature',
          unit: '°C',
          displaySlot: 99,
        },
        draft.mappings[0],
      ],
    });
    expect(tx.asset.update).toHaveBeenCalledWith({
      where: { id: 'asset-a' },
      data: {
        name: 'Motor M205',
        type: 'MOTOR',
        location: '',
        siteId: 'site-a',
        companyId: 'company-a',
      },
    });
    const rows = tx.tagMapping.createMany.mock.calls[0][0].data;
    expect(
      rows.map((row: { label: string; displaySlot: number }) => [
        row.label,
        row.displaySlot,
      ]),
    ).toEqual([
      ['Bearing temperature', 1],
      ['Load current', 2],
    ]);
    expect(
      rows.every(
        (row: { assetId: string; integrationId: string }) =>
          row.assetId === 'asset-a' && row.integrationId === 'plc-a',
      ),
    ).toBe(true);
  });
  it('does not contact a PLC belonging to another company', async () => {
    const { service, tx, opcua } = setup();
    tx.integration.findFirst.mockResolvedValue(null);
    await expect(
      service.preview('company-a', 'foreign-plc', ['ns=3;s=current']),
    ).rejects.toThrow('Integration not found');
    expect(opcua.readNodes).not.toHaveBeenCalled();
  });
  it('saves alarm tags separately from metric cards in the same transaction', async () => {
    const { service, tx } = setup();
    const alarmRules = [
      {
        name: 'Overload',
        tagName: 'Motor1.Fault',
        nodeId: 'ns=3;s=Motor1.Fault',
        integrationId: 'plc-a',
        condition: 'TRUE' as const,
        threshold: 0,
        severity: 'CRITICAL' as const,
      },
    ];
    await service.saveEquipment('company-a', { ...draft, alarmRules });
    expect(tx.asset.create.mock.calls[0][0].data.alarmRules).toEqual(
      alarmRules,
    );
    expect(tx.tagMapping.createMany.mock.calls[0][0].data).toHaveLength(1);
  });
});
