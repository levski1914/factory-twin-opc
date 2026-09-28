import { Injectable } from '@nestjs/common';

@Injectable()
export class AssetIntelligenceService {
  analyze(assetId: string, values: any) {
    const healthScore = this.calculateHealth(assetId, values);
    const alarms = this.generateAlarms(assetId, values);
    const status = this.getStatus(healthScore, alarms);
    const predictive = this.getPredictive(assetId, values);

    return {
      assetId,
      values,
      status,
      healthScore,
      alarms,
      predictive,
    };
  }

  private calculateHealth(assetId: string, values: any) {
    let score = 100;

    if (assetId === 'motor-m101') {
      if (values.temperature > 85) score -= 15;
      if (values.temperature > 100) score -= 25;
      if (values.temperature > 115) score -= 35;

      if (values.current > 18) score -= 15;
      if (values.current > 22) score -= 30;

      if (values.vibration > 8) score -= 20;
    }

    if (assetId === 'pump-p201') {
      if (values.dischargePressure < 2) score -= 20;
      if (values.vibration > 6) score -= 20;
      if (values.efficiency < 75) score -= 15;
    }

    if (assetId === 'tank-t301') {
      if (values.level < 30) score -= 25;
      if (values.level > 85) score -= 25;
    }

    if (assetId === 'valve-v401') {
      if (values.feedback !== values.command) score -= 40;
      if (values.fault) score -= 50;
    }

    return Math.max(0, score);
  }

  private generateAlarms(assetId: string, values: any) {
    const alarms: { message: string; severity: string }[] = [];
    if (assetId === 'motor-m101') {
      if (values.temperature >= 115)
        alarms.push({ message: 'Critical temperature', severity: 'CRITICAL' });
      else if (values.temperature >= 90)
        alarms.push({ message: 'High temperature', severity: 'HIGH' });

      if (values.current > 22)
        alarms.push({ message: 'Critical current', severity: 'CRITICAL' });
      else if (values.current > 18)
        alarms.push({ message: 'Over current', severity: 'HIGH' });

      if (values.vibration > 8)
        alarms.push({ message: 'High vibration', severity: 'HIGH' });
    }
    if (assetId === 'pump-p201') {
      if (values.dischargePressure < 2)
        alarms.push({ message: 'Low discharge pressure', severity: 'HIGH' });
      if (values.vibration > 6)
        alarms.push({ message: 'Pump vibration warning', severity: 'MEDIUM' });
      if (values.efficiency < 75)
        alarms.push({ message: 'Low efficiency', severity: 'LOW' });
    }

    if (assetId === 'tank-t301') {
      if (values.level < 30)
        alarms.push({ message: 'Low tank level', severity: 'HIGH' });
      if (values.level > 85)
        alarms.push({ message: 'High tank level', severity: 'HIGH' });
    }

    if (assetId === 'valve-v401') {
      if (values.feedback !== values.command)
        alarms.push({ message: 'Valve feedback mismatch', severity: 'HIGH' });
      if (values.fault)
        alarms.push({ message: 'Valve fault', severity: 'CRITICAL' });
    }

    return alarms;
  }

  private getStatus(healthScore: number, alarms: any[]) {
    if (healthScore <= 50 || alarms.some((a) => a.severity === 'CRITICAL'))
      return 'ALARM';
    if (alarms.length > 0) return 'WARNING';
    return 'RUNNING';
  }

  private getPredictive(assetId: string, values: any) {
    if (assetId === 'motor-m101') {
      if (values.temperature >= 115) {
        return {
          component: 'Bearing',
          wear: 92,
          risk: 'CRITICAL',
          daysToFailure: 3,
          recommendation: 'Immediate shutdown recommended',
        };
      }

      if (values.temperature >= 100) {
        return {
          component: 'Bearing',
          wear: 78,
          risk: 'HIGH',
          daysToFailure: 7,
          recommendation: 'Inspect bearing and cooling system',
        };
      }
      const wear = Math.min(
        100,
        Math.round(
          values.temperature * 0.35 +
            values.vibration * 4 +
            Math.max(0, values.current - 10) * 2,
        ),
      );

      return {
        component: 'Bearing',
        wear,
        risk:
          wear > 85
            ? 'CRITICAL'
            : wear > 70
              ? 'HIGH'
              : wear > 50
                ? 'MEDIUM'
                : 'LOW',
        daysToFailure: wear > 85 ? 3 : wear > 70 ? 14 : wear > 50 ? 30 : 90,
        recommendation:
          wear > 85
            ? 'Immediate shutdown recommended'
            : wear > 70
              ? 'Schedule maintenance'
              : 'Continue monitoring',
      };
    }

    return {
      component: 'General',
      wear: 0,
      risk: 'LOW',
      daysToFailure: 90,
      recommendation: 'Continue monitoring',
    };
  }
}
