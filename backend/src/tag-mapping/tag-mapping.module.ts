import { Module } from '@nestjs/common';
import { TagMappingService } from './tag-mapping.service';
import { TagMappingController } from './tag-mapping.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { OpcuaService } from '../integrations/opcua/opcua.service';

@Module({
  providers: [TagMappingService, PrismaService, OpcuaService],
  controllers: [TagMappingController],
})
export class TagMappingModule {}
