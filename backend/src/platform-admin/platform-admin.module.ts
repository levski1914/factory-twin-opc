import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformAdminController } from './platform-admin.controller';

@Module({ imports: [PrismaModule], controllers: [PlatformAdminController] })
export class PlatformAdminModule {}
