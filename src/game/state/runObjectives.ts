export interface Beacon {
  id: string;
  x: number;
  y: number;
  r: number;
  activated: boolean;
}

export interface ServiceStop {
  id: string;
  x: number;
  w: number;
  progress: number;
  serviced: boolean;
}

export interface SyncGate {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  stabilized: boolean;
}
