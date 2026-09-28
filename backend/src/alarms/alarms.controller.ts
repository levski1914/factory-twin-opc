// alarms.controller.ts
import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { AlarmsService } from './alarms.service';

@Controller('alarms')
export class AlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  @Get()
  getAll() {
    return this.alarmsService.getAll();
  }

  @Get('open')
  getOpen() {
    return this.alarmsService.getOpen();
  }

  @Patch(':id/ack')
  acknowledge(@Param('id') id: string) {
    return this.alarmsService.acknowledge(id);
  }

  @Patch(':id/resolve')
  resolve(@Param('id') id: string) {
    return this.alarmsService.resolve(id);
  }
}
