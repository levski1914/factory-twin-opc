// src/companies/companies.controller.ts
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN', 'VIEWER')
  getMyCompany(@CurrentUser() user: any) {
    return this.prisma.company.findUnique({
      where: { id: user.companyId },
      include: {
        sites: true,
        integrations: true,
        assets: true,
      },
    });
  }

  @Patch('me')
  @Roles('OWNER', 'ADMIN')
  updateMyCompany(
    @CurrentUser() user: any,
    @Body() body: { name?: string; industry?: string; description?: string },
  ) {
    return this.prisma.company.update({
      where: { id: user.companyId },
      data: {
        name: body.name,
        industry: body.industry,
        description: body.description,
      },
    });
  }
}
