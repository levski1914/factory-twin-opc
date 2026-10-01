import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  NotFoundException,
  ConflictException,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
  async create(@Body() body: CreateIntegrationDto, @CurrentUser() user: any) {
    if (
      !user.companyId ||
      !body ||
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      body.name.length > 120 ||
      typeof body.endpointUrl !== 'string' ||
      !body.endpointUrl.startsWith('opc.tcp://') ||
      !body.siteId
    )
      throw new BadRequestException('Provide a name, OPC UA endpoint and site');
    const site = await this.prisma.site.findFirst({
      where: { id: body.siteId, companyId: user.companyId },
    });
    if (!site)
      throw new BadRequestException('Site does not belong to your company');
    return this.prisma.integration.create({
      data: {
        name: body.name.trim(),
        type: 'OPC_UA',
        endpointUrl: body.endpointUrl,
        companyId: user.companyId,
        siteId: body.siteId,
      },
    });
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN', 'VIEWER')
  findAll(@CurrentUser() user: any, @Query('siteId') siteId?: string) {
    if (!user.companyId)
      throw new BadRequestException('A company account is required');
    return this.prisma.integration.findMany({
      where: {
        companyId: user.companyId,
        ...(siteId ? { siteId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN', 'TECHNICIAN')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user.companyId)
      throw new BadRequestException('A company account is required');
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const integration = await tx.integration.findFirst({
            where: { id, companyId: user.companyId },
          });
          if (!integration)
            throw new NotFoundException('Integration not found');
          const mappings = await tx.tagMapping.count({
            where: { integrationId: id },
          });
          const assets = await tx.asset.findMany({
            where: { companyId: user.companyId },
            select: { alarmRules: true },
          });
          const alarmUse = assets.some(
            (asset) =>
              Array.isArray(asset.alarmRules) &&
              asset.alarmRules.some(
                (rule) =>
                  rule &&
                  typeof rule === 'object' &&
                  !Array.isArray(rule) &&
                  rule.integrationId === id,
              ),
          );
          if (mappings || alarmUse)
            throw new ConflictException(
              'This integration is used by equipment or alarm tags. Reassign those tags before deleting it.',
            );
          await tx.integration.delete({ where: { id } });
          return { ok: true };
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        ['P2003', 'P2034'].includes(String(error.code))
      )
        throw new ConflictException(
          'Integration changed or is in use. Refresh and try again.',
        );
      throw error;
    }
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
