// src/sites/sites.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sites')
export class SitesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN', 'VIEWER')
  findAll(@CurrentUser() user: any) {
    return this.prisma.site.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  create(
    @CurrentUser() user: any,
    @Body()
    body: { name: string; country?: string; city?: string; location?: string },
  ) {
    return this.prisma.site.create({
      data: {
        name: body.name,
        country: body.country,
        city: body.city,
        location: body.location,
        companyId: user.companyId,
      },
    });
  }
}
