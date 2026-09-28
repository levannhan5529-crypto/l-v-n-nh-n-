export type ComponentType =
  | "battery"
  | "resistor"
  | "bulb"
  | "switch"
  | "potentiometer"
  | "fuse"
  | "capacitor"
  | "wire"
  | "coin"
  | "eraser";

export interface CircuitTerminal {
  id: string;
  componentId: string;
  terminalIndex: 0 | 1;
  x: number;
  y: number;
  nodeId: string; // Electrical node identifier
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  rotation: number; // 0, 90, 180, 270
  terminals: [CircuitTerminal, CircuitTerminal];
  value: number; // Voltage (V), Resistance (Ohm), Capacitance (uF), Fuse limit (A)
  state?: boolean; // switch: true = closed, false = open; fuse: true = intact, false = blown
  label: string;
  current: number; // Current flowing through component (A)
  voltageDrop: number; // Voltage across component (V)
  power: number; // Power (W)
  isBlown?: boolean; // For bulb or fuse
}

export interface VoltmeterProbe {
  x: number;
  y: number;
  connectedNodeId: string | null;
}

export interface VoltmeterState {
  redProbe: VoltmeterProbe;
  blackProbe: VoltmeterProbe;
  voltageReading: number | null;
}

export interface AmmeterProbe {
  x: number;
  y: number;
  currentReading: number | null;
  activeComponentId: string | null;
}

export interface CircuitSolveResult {
  nodeVoltages: Record<string, number>; // nodeId -> voltage (V)
  componentResults: Record<
    string,
    {
      current: number;
      voltageDrop: number;
      power: number;
      isBlown?: boolean;
    }
  >;
  isShortCircuit: boolean;
  totalPower: number;
  activeElectronsCount: number;
}
