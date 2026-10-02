import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OpcuaService } from '../integrations/opcua/opcua.service';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
@Module({
  imports: [PrismaModule],
  providers: [MonitoringService, OpcuaService],
  controllers: [MonitoringController],
})
export class MonitoringModule {}
