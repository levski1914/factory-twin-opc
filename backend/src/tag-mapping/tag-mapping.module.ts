import { Module } from '@nestjs/common';
import { TagMappingService } from './tag-mapping.service';
import { TagMappingController } from './tag-mapping.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [TagMappingService, PrismaService],
  controllers: [TagMappingController],
})
export class TagMappingModule {}
