import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OpcuaService } from '../integrations/opcua/opcua.service';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
@Module({
  imports: [PrismaModule],
  providers: [HistoryService, MonitoringService, OpcuaService],
  controllers: [HistoryController, MonitoringController],
})
export class MonitoringModule {}
