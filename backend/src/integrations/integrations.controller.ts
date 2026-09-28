import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { OpcuaService } from './opcua/opcua.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateIntegrationDto } from './dto/create-integration.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly opcuaService: OpcuaService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN')
  create(@Body() body: CreateIntegrationDto, @CurrentUser() user: any) {
    return this.prisma.integration.create({
      data: {
        name: body.name,
        type: body.type ?? 'OPC_UA',
        endpointUrl: body.endpointUrl,
        companyId: user.companyId,
        siteId: body.siteId,
      },
    });
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN', 'VIEWER')
  findAll(@CurrentUser() user: any, @Query('siteId') siteId?: string) {
    return this.prisma.integration.findMany({
      where: {
        companyId: user.companyId,
        ...(siteId ? { siteId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('opcua/test')
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN')
  test(@Body() body: { endpointUrl?: string }) {
    if (!body?.endpointUrl) {
      return {
        ok: false,
        message: 'Missing endpointUrl in request body',
      };
    }

    return this.opcuaService.testConnection(body.endpointUrl);
  }

  @Post('opcua/browse')
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN')
  browse(@Body() body: { endpointUrl: string; nodeId?: string }) {
    return this.opcuaService.browse(body.endpointUrl, body.nodeId);
  }

  @Post('opcua/read')
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN', 'VIEWER')
  read(@Body() body: { endpointUrl: string; nodeId: string }) {
    return this.opcuaService.readNode(body.endpointUrl, body.nodeId);
  }

  @Post('opcua/read-motor')
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN', 'VIEWER')
  readMotor(@Body() body: { endpointUrl: string }) {
    return this.opcuaService.readMotor(body.endpointUrl);
  }
}
