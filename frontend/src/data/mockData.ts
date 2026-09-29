export type AssetStatus = "RUNNING" | "STOPPED" | "WARNING" | "ALARM";

export type Asset = {
  id: string;
  name: string;
  type: "Motor" | "Pump" | "Tank" | "Valve";
  status: AssetStatus;
  healthScore: number;
  location: string;
  values: {
    [key: string]: number | string | boolean | undefined;
    speed?: number;
    current?: number;
    temperature?: number;
    vibration?: number;
    runtime?: number;
    flow?: number;
    pressure?: number;
    level?: number;
    position?: "OPEN" | "CLOSED";
  };
};

export type Alarm = {
  id: string;
  assetId: string;
  assetName: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  time: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "CLEARED";
};

export const assets: Asset[] = [
  {
    id: "motor-m101",
    name: "MOTOR M101",
    type: "Motor",
    status: "WARNING",
    healthScore: 72,
    location: "Plant 1 / Line A",
    values: {
      speed: 1490,
      current: 8.7,
      temperature: 63.2,
      vibration: 7.8,
      runtime: 1250,
    },
  },
  {
    id: "pump-p201",
    name: "PUMP P201",
    type: "Pump",
    status: "RUNNING",
    healthScore: 81,
    location: "Plant 1 / Line A",
    values: {
      flow: 23.4,
      pressure: 2.6,
      vibration: 5.2,
      runtime: 980,
    },
  },
  {
    id: "tank-t301",
    name: "TANK T301",
    type: "Tank",
    status: "RUNNING",
    healthScore: 88,
    location: "Plant 1 / Area B",
    values: {
      level: 68,
      temperature: 24.5,
    },
  },
  {
    id: "valve-v401",
    name: "VALVE V401",
    type: "Valve",
    status: "RUNNING",
    healthScore: 94,
    location: "Plant 1 / Line A",
    values: {
      position: "OPEN",
    },
  },
];

export const alarms: Alarm[] = [
  {
    id: "a1",
    assetId: "motor-m101",
    assetName: "MOTOR M101",
    message: "High vibration detected",
    severity: "HIGH",
    time: "2 min ago",
    status: "ACTIVE",
  },
  {
    id: "a2",
    assetId: "motor-m101",
    assetName: "MOTOR M101",
    message: "Temperature rising above normal",
    severity: "MEDIUM",
    time: "5 min ago",
    status: "ACTIVE",
  },
  {
    id: "a3",
    assetId: "pump-p201",
    assetName: "PUMP P201",
    message: "Bearing inspection recommended",
    severity: "LOW",
    time: "18 min ago",
    status: "ACKNOWLEDGED",
  },
];

export const trendData = [
  { time: "10:00", temperature: 56, vibration: 4.2, current: 7.4 },
  { time: "11:00", temperature: 58, vibration: 4.8, current: 7.7 },
  { time: "12:00", temperature: 60, vibration: 5.6, current: 8.0 },
  { time: "13:00", temperature: 61, vibration: 6.2, current: 8.2 },
  { time: "14:00", temperature: 63.2, vibration: 7.8, current: 8.7 },
];
