import { CircuitComponent, CircuitSolveResult } from "./types";

/**
 * Union-Find Disjoint Set Helper to cluster terminals into electrical nodes
 */
class DisjointSet {
  parent: Record<string, string> = {};

  find(id: string): string {
    if (!this.parent[id]) {
      this.parent[id] = id;
    }
    if (this.parent[id] !== id) {
      this.parent[id] = this.find(this.parent[id]);
    }
    return this.parent[id];
  }

  union(id1: string, id2: string) {
    const root1 = this.find(id1);
    const root2 = this.find(id2);
    if (root1 !== root2) {
      this.parent[root1] = root2;
    }
  }
}

/**
 * Solves arbitrary DC circuits using Modified Nodal Analysis (MNA)
 */
export function solveCircuit(components: CircuitComponent[]): CircuitSolveResult {
  const result: CircuitSolveResult = {
    nodeVoltages: {},
    componentResults: {},
    isShortCircuit: false,
    totalPower: 0,
    activeElectronsCount: 0,
  };

  if (components.length === 0) {
    return result;
  }

  // 1. Group terminals within SNAP_DISTANCE into shared electrical nodes
  const ds = new DisjointSet();
  const SNAP_DISTANCE = 24;

  const allTerminals: { id: string; x: number; y: number; compId: string; termIdx: number }[] = [];
  components.forEach((c) => {
    allTerminals.push({
      id: c.terminals[0].id,
      x: c.terminals[0].x,
      y: c.terminals[0].y,
      compId: c.id,
      termIdx: 0,
    });
    allTerminals.push({
      id: c.terminals[1].id,
      x: c.terminals[1].x,
      y: c.terminals[1].y,
      compId: c.id,
      termIdx: 1,
    });
  });

  // Check distances and union
  for (let i = 0; i < allTerminals.length; i++) {
    for (let j = i + 1; j < allTerminals.length; j++) {
      const t1 = allTerminals[i];
      const t2 = allTerminals[j];
      const dist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
      if (dist <= SNAP_DISTANCE) {
        ds.union(t1.id, t2.id);
      }
    }
  }

  // Merge direct wires into their terminal nodes
  components.forEach((c) => {
    if (c.type === "wire") {
      ds.union(c.terminals[0].id, c.terminals[1].id);
    }
  });

  // Assign node mapping
  const terminalNodeMap: Record<string, string> = {};
  allTerminals.forEach((t) => {
    terminalNodeMap[t.id] = ds.find(t.id);
  });

  // Extract distinct nodes
  const distinctNodes = Array.from(new Set(Object.values(terminalNodeMap)));
  const nodeIndexMap: Record<string, number> = {};
  distinctNodes.forEach((nodeId, idx) => {
    nodeIndexMap[nodeId] = idx;
    result.nodeVoltages[nodeId] = 0;
  });

  // Batteries in the circuit
  const batteries = components.filter((c) => c.type === "battery");
  if (batteries.length === 0 || distinctNodes.length < 2) {
    // No active source
    components.forEach((c) => {
      result.componentResults[c.id] = { current: 0, voltageDrop: 0, power: 0 };
    });
    return result;
  }

  // Select ground reference node (negative terminal of the first battery)
  const firstBat = batteries[0];
  const groundTerminalId = firstBat.terminals[0].id;
  const groundNode = terminalNodeMap[groundTerminalId];
  const groundIdx = nodeIndexMap[groundNode] ?? 0;

  // Set up MNA matrix: size = N_nodes + N_voltage_sources
  const n = distinctNodes.length;
  const m = batteries.length;
  const matrixSize = n + m;

  // Initialize Matrix A and Vector Z
  const A: number[][] = Array(matrixSize)
    .fill(0)
    .map(() => Array(matrixSize).fill(0));
  const Z: number[] = Array(matrixSize).fill(0);

  // Helper to add conductance between node u and node v
  const addConductance = (nodeU: string, nodeV: string, g: number) => {
    const u = nodeIndexMap[nodeU];
    const v = nodeIndexMap[nodeV];
    if (u === undefined || v === undefined) return;
    if (u === v) return; // Same node

    A[u][u] += g;
    A[v][v] += g;
    A[u][v] -= g;
    A[v][u] -= g;
  };

  // Add passive components into conductance matrix
  components.forEach((c) => {
    const nodeA = terminalNodeMap[c.terminals[0].id];
    const nodeB = terminalNodeMap[c.terminals[1].id];

    if (c.type === "battery" || c.type === "wire") {
      return; // Handled separately
    }

    let resistance = 10;
    if (c.type === "resistor") {
      resistance = Math.max(0.1, c.value);
    } else if (c.type === "bulb") {
      resistance = c.isBlown ? 1e9 : Math.max(0.5, c.value);
    } else if (c.type === "switch") {
      resistance = c.state ? 0.001 : 1e9; // Closed vs Open
    } else if (c.type === "fuse") {
      resistance = c.state ? 0.001 : 1e9; // Intact vs Blown
    } else if (c.type === "potentiometer") {
      resistance = Math.max(0.1, c.value);
    } else if (c.type === "capacitor") {
      // In DC steady state, capacitor blocks current
      resistance = 1e8;
    } else if (c.type === "coin") {
      resistance = 0.005; // Excellent conductor
    } else if (c.type === "eraser") {
      resistance = 1e9; // Insulator
    }

    const g = 1 / resistance;
    addConductance(nodeA, nodeB, g);
  });

  // Add battery voltage constraints
  batteries.forEach((bat, bIdx) => {
    const nodeMinus = terminalNodeMap[bat.terminals[0].id];
    const nodePlus = terminalNodeMap[bat.terminals[1].id];
    const u = nodeIndexMap[nodeMinus];
    const v = nodeIndexMap[nodePlus];
    const row = n + bIdx;

    if (u !== undefined && v !== undefined) {
      if (u === v) {
        // Battery terminals shorted directly to each other!
        result.isShortCircuit = true;
      }

      // V_plus - V_minus = bat.value
      A[row][v] = 1;
      A[row][u] = -1;
      A[v][row] += 1;
      A[u][row] -= 1;
      Z[row] = bat.value;
    }
  });

  // Fix ground node equation: V_ground = 0
  for (let j = 0; j < matrixSize; j++) {
    A[groundIdx][j] = 0;
  }
  A[groundIdx][groundIdx] = 1;
  Z[groundIdx] = 0;

  // Solve linear system A * X = Z using Gaussian elimination with partial pivoting
  const X = solveLinearSystem(A, Z);

  if (X) {
    // Populate node voltages
    distinctNodes.forEach((nodeId, idx) => {
      result.nodeVoltages[nodeId] = Math.round(X[idx] * 1000) / 1000;
    });

    // Compute currents & powers for each component
    components.forEach((c) => {
      const nodeA = terminalNodeMap[c.terminals[0].id];
      const nodeB = terminalNodeMap[c.terminals[1].id];
      const vA = result.nodeVoltages[nodeA] ?? 0;
      const vB = result.nodeVoltages[nodeB] ?? 0;
      const vDrop = Math.abs(vB - vA);

      let current = 0;
      let power = 0;

      if (c.type === "battery") {
        const bIdx = batteries.findIndex((b) => b.id === c.id);
        if (bIdx !== -1) {
          const currentFromMNA = Math.abs(X[n + bIdx] || 0);
          current = Math.round(currentFromMNA * 1000) / 1000;
          power = Math.round(current * c.value * 100) / 100;

          // Check if battery current is dangerously high (> 20A)
          if (current > 20 || (vDrop < 0.1 && c.value > 1 && current > 5)) {
            result.isShortCircuit = true;
          }
        }
      } else if (c.type === "wire") {
        // Wire current mirrors attached branch
        current = 0;
      } else {
        let r = 10;
        if (c.type === "resistor" || c.type === "potentiometer") r = Math.max(0.1, c.value);
        else if (c.type === "bulb") r = c.isBlown ? 1e9 : Math.max(0.5, c.value);
        else if (c.type === "switch") r = c.state ? 0.001 : 1e9;
        else if (c.type === "fuse") r = c.state ? 0.001 : 1e9;
        else if (c.type === "coin") r = 0.005;
        else if (c.type === "eraser" || c.type === "capacitor") r = 1e8;

        current = r >= 1e8 ? 0 : Math.round((vDrop / r) * 1000) / 1000;
        power = Math.round(vDrop * current * 100) / 100;

        // Check if fuse blows
        if (c.type === "fuse" && c.state && current > c.value) {
          result.componentResults[c.id] = {
            current,
            voltageDrop: vDrop,
            power,
            isBlown: true,
          };
          return;
        }

        // Check if bulb blows from extreme overvoltage/power (> 350W)
        if (c.type === "bulb" && !c.isBlown && power > 350) {
          result.componentResults[c.id] = {
            current,
            voltageDrop: vDrop,
            power,
            isBlown: true,
          };
          return;
        }
      }

      result.componentResults[c.id] = {
        current,
        voltageDrop: Math.round(vDrop * 100) / 100,
        power,
      };

      result.totalPower += power;
      if (current > 0.01) {
        result.activeElectronsCount += 1;
      }
    });
  }

  return result;
}

/**
 * Standard Gaussian elimination solver with partial pivoting
 */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  // Clone to avoid mutating original
  const M = A.map((row) => [...row]);
  const B = [...b];

  for (let p = 0; p < n; p++) {
    // Find pivot row
    let maxRow = p;
    let maxVal = Math.abs(M[p][p]);
    for (let r = p + 1; r < n; r++) {
      if (Math.abs(M[r][p]) > maxVal) {
        maxVal = Math.abs(M[r][p]);
        maxRow = r;
      }
    }

    if (maxVal < 1e-9) {
      continue; // Singular or unconstrained node
    }

    // Swap pivot row
    if (maxRow !== p) {
      const tempRow = M[p];
      M[p] = M[maxRow];
      M[maxRow] = tempRow;

      const tempB = B[p];
      B[p] = B[maxRow];
      B[maxRow] = tempB;
    }

    // Eliminate below
    for (let r = p + 1; r < n; r++) {
      const factor = M[r][p] / M[p][p];
      B[r] -= factor * B[p];
      for (let c = p; c < n; c++) {
        M[r][c] -= factor * M[p][c];
      }
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = B[r];
    for (let c = r + 1; c < n; c++) {
      sum -= M[r][c] * x[c];
    }
    if (Math.abs(M[r][r]) > 1e-9) {
      x[r] = sum / M[r][r];
    } else {
      x[r] = 0;
    }
  }

  return x;
}
