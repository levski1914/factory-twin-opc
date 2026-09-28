import { Injectable } from '@nestjs/common';

@Injectable()
export class SimulatorService {
  private assets = {
    'motor-m101': {
      status: 'RUNNING',
      current: 8.7,
      voltage: 400,
      power: 5.8,
      temperature: 63.2,
      vibration: 5.5,
      speed: 1490,
      runtime: 1250,
    },

    'pump-p201': {
      status: 'RUNNING',
      flow: 23.4,
      pressure: 2.6,
      suctionPressure: 0.8,
      dischargePressure: 2.6,
      vibration: 4.5,
      efficiency: 82,
      runtime: 980,
    },

    'tank-t301': {
      status: 'NORMAL',
      level: 68,
      volume: 6800,
      capacity: 10000,
      temperature: 24.5,
      inletFlow: 22.5,
      outletFlow: 21.8,
    },

    'valve-v401': {
      command: 'OPEN',
      feedback: 'OPEN',
      position: 100,
      travelTime: 2.3,
      cycles: 12450,
      fault: false,
    },
  };

  getAllAssetsData() {
    this.simulateMotor();
    this.simulatePump();
    this.simulateTank();
    this.simulateValve();

    return this.assets;
  }

  private simulateMotor() {
    const motor = this.assets['motor-m101'];

    motor.voltage = this.drift(motor.voltage, 400, 2, 390, 410);
    motor.current = this.drift(motor.current, 8.7, 0.7, 6, 11);
    motor.temperature = this.drift(motor.temperature, 64, 2.4, 50, 90);
    motor.vibration = this.drift(motor.vibration, 5.5, 0.9, 3, 10);
    motor.speed = Math.round(this.drift(motor.speed, 1490, 8, 1400, 1520));
    motor.power = Number(
      ((motor.voltage * motor.current * 0.85) / 1000).toFixed(1),
    );
    motor.runtime += 1;

    motor.status =
      motor.temperature > 85 || motor.vibration > 9 || motor.current > 10
        ? 'ALARM'
        : motor.temperature > 70 || motor.vibration > 8 || motor.current > 9
          ? 'WARNING'
          : 'RUNNING';
  }

  private simulatePump() {
    const pump = this.assets['pump-p201'];

    pump.flow = this.drift(pump.flow, 23.4, 2.2, 18, 28);
    pump.suctionPressure = this.drift(
      pump.suctionPressure,
      0.8,
      0.08,
      0.4,
      1.2,
    );
    pump.dischargePressure = this.drift(
      pump.dischargePressure,
      2.6,
      0.45,
      1.6,
      3.5,
    );
    pump.pressure = pump.dischargePressure;
    pump.vibration = this.drift(pump.vibration, 4.5, 0.8, 2.5, 8);
    pump.efficiency = this.drift(pump.efficiency, 82, 0.4, 65, 90);
    pump.runtime += 1;

    pump.status =
      pump.dischargePressure < 1.7 || pump.vibration > 7.5
        ? 'ALARM'
        : pump.dischargePressure < 2 || pump.vibration > 6
          ? 'WARNING'
          : 'RUNNING';
  }

  private simulateTank() {
    const tank = this.assets['tank-t301'];

    tank.inletFlow = this.drift(tank.inletFlow, 22.5, 0.8, 18, 26);
    tank.outletFlow = this.drift(tank.outletFlow, 21.8, 0.8, 18, 26);

    const delta = (tank.inletFlow - tank.outletFlow) * 0.15;
    tank.level = this.clamp(Number((tank.level + delta).toFixed(1)), 20, 90);
    tank.volume = Math.round((tank.capacity * tank.level) / 100);
    tank.temperature = this.drift(tank.temperature, 24.5, 0.2, 18, 35);

    tank.status =
      tank.level < 25 || tank.level > 88
        ? 'ALARM'
        : tank.level < 35 || tank.level > 82
          ? 'WARNING'
          : 'NORMAL';
  }

  private simulateValve() {
    const valve = this.assets['valve-v401'];

    if (Math.random() < 0.02) {
      valve.command = valve.command === 'OPEN' ? 'CLOSE' : 'OPEN';
    }

    valve.feedback = Math.random() > 0.01 ? valve.command : 'FAULT';
    valve.position =
      valve.feedback === 'OPEN'
        ? 100
        : valve.feedback === 'CLOSE'
          ? 0
          : valve.position;
    valve.travelTime = this.drift(valve.travelTime, 2.3, 0.1, 1.8, 3.5);
    valve.cycles += Math.random() < 0.02 ? 1 : 0;
    valve.fault = valve.feedback === 'FAULT';
  }

  private drift(
    current: number,
    target: number,
    noise: number,
    min: number,
    max: number,
  ) {
    const correction = (target - current) * 0.18;
    const random = (Math.random() - 0.5) * noise;
    const wave = Math.sin(Date.now() / 3000) * noise * 0.15;

    const next = current + correction + random + wave;

    return Number(this.clamp(next, min, max).toFixed(2));
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }
}
