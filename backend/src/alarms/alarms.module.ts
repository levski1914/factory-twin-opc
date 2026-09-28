import { Module } from '@nestjs/common';
import { AlarmsController } from './alarms.controller';
import { AlarmsService } from './alarms.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [AlarmsController],
  providers: [AlarmsService, PrismaService],
})
export class AlarmsModule {}
