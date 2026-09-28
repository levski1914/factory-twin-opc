import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('platform-admin')
export class PlatformAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('overview')
  async overview() {
    const [companies, users, sites, integrations, companyList] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.user.count(),
      this.prisma.site.count(),
      this.prisma.integration.count(),
      this.prisma.company.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, createdAt: true, _count: { select: { users: true, sites: true, integrations: true } } },
      }),
    ]);
    return { counts: { companies, users, sites, integrations }, companies: companyList };
  }
}
