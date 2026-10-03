import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
type Actor = { companyId?: string; role: string };
const publicFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;
@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}
  private authorize(user: Actor) {
    if (!user.companyId || !['OWNER', 'ADMIN'].includes(user.role))
      throw new ForbiddenException('Company owner or administrator required');
    return user.companyId;
  }
  list(user: Actor) {
    return this.prisma.user.findMany({
      where: { companyId: this.authorize(user) },
      select: publicFields,
      orderBy: { createdAt: 'asc' },
    });
  }
  async create(
    user: Actor,
    body: {
      name?: unknown;
      email?: unknown;
      password?: unknown;
      role?: unknown;
    },
  ) {
    const companyId = this.authorize(user);
    if (
      !body ||
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      body.name.length > 120 ||
      typeof body.email !== 'string' ||
      body.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
      typeof body.password !== 'string' ||
      body.password.length < 12 ||
      Buffer.byteLength(body.password, 'utf8') > 72 ||
      typeof body.role !== 'string' ||
      !['ADMIN', 'TECHNICIAN', 'VIEWER'].includes(body.role)
    )
      throw new BadRequestException(
        'Provide a name, valid email, role and password of at least 12 characters (maximum 72 UTF-8 bytes)',
      );
    if (body.role === 'ADMIN' && user.role !== 'OWNER')
      throw new ForbiddenException(
        'Only the company owner can create administrators',
      );
    const email = body.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException(
        'This email cannot be used to create a new account',
      );
    const password = await bcrypt.hash(body.password, 10);
    try {
      return await this.prisma.user.create({
        data: {
          name: body.name.trim(),
          email,
          password,
          role: body.role,
          companyId,
        },
        select: publicFields,
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException(
          'This email cannot be used to create a new account',
        );
      throw error;
    }
  }
}
