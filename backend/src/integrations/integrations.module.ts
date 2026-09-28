import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { OpcuaService } from './opcua/opcua.service';
import { IntegrationsController } from './integrations.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [IntegrationsService, OpcuaService, PrismaService],
  controllers: [IntegrationsController],
})
export class IntegrationsModule {}
