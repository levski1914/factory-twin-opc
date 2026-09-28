import { Module } from '@nestjs/common';
import { SitesController } from './sites.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [SitesController],
  providers: [PrismaService],
})
export class SitesModule {}
