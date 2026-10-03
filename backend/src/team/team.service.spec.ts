jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));
import { TeamService } from './team.service';
const owner = { companyId: 'a', role: 'OWNER' };
const input = {
  name: ' Engineer ',
  email: ' ENGINEER@EXAMPLE.COM ',
  password: 'long-password-123',
  role: 'TECHNICIAN',
};
function setup() {
  const user = {
    findMany: jest.fn(),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest
      .fn()
      .mockResolvedValue({
        id: 'u',
        name: 'Engineer',
        email: 'engineer@example.com',
        role: 'TECHNICIAN',
      }),
  };
  return { user, service: new TeamService({ user } as any) };
}
describe('Company team boundaries', () => {
  it('lists only current company and excludes credential fields', () => {
    const { service, user } = setup();
    service.list(owner);
    expect(user.findMany.mock.calls[0][0].where).toEqual({ companyId: 'a' });
    expect(user.findMany.mock.calls[0][0].select).not.toHaveProperty(
      'password',
    );
  });
  it('assigns server company and hashes credentials, ignoring supplied company', async () => {
    const { service, user } = setup();
    await service.create(owner, { ...input, companyId: 'other' } as any);
    expect(user.create.mock.calls[0][0].data).toEqual({
      name: 'Engineer',
      email: 'engineer@example.com',
      password: 'hashed-password',
      role: 'TECHNICIAN',
      companyId: 'a',
    });
    expect(user.create.mock.calls[0][0].select).not.toHaveProperty('password');
  });
  it.each(['TECHNICIAN', 'VIEWER', 'SUPER_ADMIN'])(
    'denies team management for %s',
    async (role) => {
      const { service, user } = setup();
      await expect(service.create({ ...owner, role }, input)).rejects.toThrow();
      expect(user.create).not.toHaveBeenCalled();
    },
  );
  it('denies companyless accounts and admin creation by admins', async () => {
    const { service } = setup();
    await expect(service.create({ role: 'OWNER' }, input)).rejects.toThrow();
    await expect(
      service.create({ ...owner, role: 'ADMIN' }, { ...input, role: 'ADMIN' }),
    ).rejects.toThrow('Only the company owner');
  });
  it.each(['OWNER', 'SUPER_ADMIN', 'invalid'])(
    'rejects role elevation %s',
    async (role) => {
      const { service } = setup();
      await expect(service.create(owner, { ...input, role })).rejects.toThrow();
    },
  );
  it('rejects duplicate accounts without changing their company', async () => {
    const { service, user } = setup();
    user.findFirst.mockResolvedValue({ id: 'existing' } as never);
    await expect(service.create(owner, input)).rejects.toThrow(
      'cannot be used',
    );
    expect(user.create).not.toHaveBeenCalled();
  });
  it('rejects short passwords and excessive UTF-8 byte length', async () => {
    const { service } = setup();
    for (const password of ['short', 'я'.repeat(40)])
      await expect(
        service.create(owner, { ...input, password }),
      ).rejects.toThrow();
  });
});
