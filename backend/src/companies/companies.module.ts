import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [CompaniesController],
  providers: [PrismaService],
})
export class CompaniesModule {}
