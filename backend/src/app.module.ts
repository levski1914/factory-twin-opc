import { MonitoringModule } from './monitoring/monitoring.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SimulatorModule } from './simulator/simulator.module';
import { GatewayModule } from './gateway/gateway.module';
import { PrismaModule } from './prisma/prisma.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { AlarmsModule } from './alarms/alarms.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { TagMappingModule } from './tag-mapping/tag-mapping.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { SitesModule } from './sites/sites.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';

@Module({
  imports: [
    MonitoringModule,
    SimulatorModule,
    GatewayModule,
    PrismaModule,
    TelemetryModule,
    AlarmsModule,
    IntegrationsModule,
    TagMappingModule,
    AuthModule,
    CompaniesModule,
    SitesModule,
    PlatformAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
