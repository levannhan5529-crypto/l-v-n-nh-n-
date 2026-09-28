/**
 * PHY-AI LAB: Physics & Mathematics Engine
 * Numerical methods, regression analysis, filtering, and kinematics calculations
 */

export interface Point2D {
  x: number;
  y: number;
}

// 1. Moving Average Filter
export function movingAverage(data: number[], windowSize: number = 3): number[] {
  if (data.length === 0) return [];
  if (windowSize <= 1 || data.length < windowSize) return [...data];

  const result: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(data.length - 1, i + halfWindow);
    let sum = 0;
    let count = 0;
    for (let j = start; j <= end; j++) {
      sum += data[j];
      count++;
    }
    result.push(sum / count);
  }
  return result;
}

// 2. 5-point Savitzky-Golay quadratic/cubic smoothing filter
export function savitzkyGolay5(data: number[]): number[] {
  if (data.length < 5) return movingAverage(data, 3);
  const result: number[] = [];
  const n = data.length;

  // Coefficients for 5-point quadratic: [-3, 12, 17, 12, -3] / 35
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      result.push((31 * data[0] + 9 * data[1] - 3 * data[2] - 5 * data[3] + 3 * data[4]) / 35);
    } else if (i === 1) {
      result.push((9 * data[0] + 13 * data[1] + 12 * data[2] + 6 * data[3] - 5 * data[4]) / 35);
    } else if (i === n - 2) {
      result.push((-5 * data[n - 5] + 6 * data[n - 4] + 12 * data[n - 3] + 13 * data[n - 2] + 9 * data[n - 1]) / 35);
    } else if (i === n - 1) {
      result.push((3 * data[n - 5] - 5 * data[n - 4] - 3 * data[n - 3] + 9 * data[n - 2] + 31 * data[n - 1]) / 35);
    } else {
      const val = (-3 * data[i - 2] + 12 * data[i - 1] + 17 * data[i] + 12 * data[i + 1] - 3 * data[i + 2]) / 35;
      result.push(val);
    }
  }
  return result;
}

// 3. Central Difference Numerical Derivative (velocity or acceleration)
export function numericalDerivative(values: number[], timeStep: number): number[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [0];
  const deriv: number[] = new Array(n).fill(0);

  // Forward diff for first point
  deriv[0] = (values[1] - values[0]) / timeStep;

  // Central diff for interior points
  for (let i = 1; i < n - 1; i++) {
    deriv[i] = (values[i + 1] - values[i - 1]) / (2 * timeStep);
  }

  // Backward diff for last point
  deriv[n - 1] = (values[n - 1] - values[n - 2]) / timeStep;

  return deriv;
}

// 4. Linear Regression: y = a * x + b
export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; rSquared: number } {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
    sumYY += y[i] * y[i];
  }

  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-12) {
    return { slope: 0, intercept: sumY / n, rSquared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yPred = slope * x[i] + intercept;
    ssTot += (y[i] - meanY) ** 2;
    ssRes += (y[i] - yPred) ** 2;
  }
  const rSquared = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1;

  return { slope, intercept, rSquared };
}

// 5. Quadratic Polynomial Regression: y = a * x^2 + b * x + c
// Solves 3x3 normal equations via Gaussian Elimination
export function quadraticRegression(x: number[], y: number[]): {
  a: number;
  b: number;
  c: number;
  rSquared: number;
  predict: (val: number) => number;
} {
  const n = x.length;
  if (n < 3) {
    return {
      a: 0,
      b: 0,
      c: 0,
      rSquared: 0,
      predict: () => 0,
    };
  }

  // Sums of powers
  let s0 = n;
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;
  let s4 = 0;
  let sy0 = 0;
  let sy1 = 0;
  let sy2 = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    const xi2 = xi * xi;
    s1 += xi;
    s2 += xi2;
    s3 += xi2 * xi;
    s4 += xi2 * xi2;
    sy0 += yi;
    sy1 += xi * yi;
    sy2 += xi2 * yi;
  }

  // Augmented matrix [ [s4, s3, s2, sy2], [s3, s2, s1, sy1], [s2, s1, s0, sy0] ]
  const M = [
    [s4, s3, s2, sy2],
    [s3, s2, s1, sy1],
    [s2, s1, s0, sy0],
  ];

  // Gaussian elimination with partial pivoting
  for (let col = 0; col < 3; col++) {
    let maxRow = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) {
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      const temp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = temp;
    }

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let j = col; j <= 3; j++) {
      M[col][j] /= pivot;
    }

    for (let row = 0; row < 3; row++) {
      if (row !== col) {
        const factor = M[row][col];
        for (let j = col; j <= 3; j++) {
          M[row][j] -= factor * M[col][j];
        }
      }
    }
  }

  const a = M[0][3] || 0;
  const b = M[1][3] || 0;
  const c = M[2][3] || 0;

  // Calculate R²
  const meanY = sy0 / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yPred = a * x[i] * x[i] + b * x[i] + c;
    ssTot += (y[i] - meanY) ** 2;
    ssRes += (y[i] - yPred) ** 2;
  }
  const rSquared = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1;

  return {
    a,
    b,
    c,
    rSquared,
    predict: (val: number) => a * val * val + b * val + c,
  };
}

// 6. Sinusoidal Analysis (Harmonic Oscillation): calculates Amplitude, Period T, Frequency f
export function harmonicAnalysis(t: number[], x: number[]): {
  amplitude: number;
  period: number;
  frequency: number;
  omega: number;
  equilibrium: number;
} {
  if (t.length < 5) {
    return { amplitude: 0, period: 1, frequency: 1, omega: 2 * Math.PI, equilibrium: 0 };
  }

  // Mean equilibrium
  const meanX = x.reduce((a, b) => a + b, 0) / x.length;
  const centered = x.map((v) => v - meanX);

  // Find local peaks
  const peaks: { t: number; val: number }[] = [];
  for (let i = 1; i < centered.length - 1; i++) {
    if (centered[i] > centered[i - 1] && centered[i] > centered[i + 1] && centered[i] > 0.02) {
      peaks.push({ t: t[i], val: centered[i] });
    }
  }

  let period = 0;
  if (peaks.length >= 2) {
    let sumT = 0;
    for (let i = 1; i < peaks.length; i++) {
      sumT += peaks[i].t - peaks[i - 1].t;
    }
    period = sumT / (peaks.length - 1);
  } else {
    // Zero-crossing fallback
    const zeroCrossings: number[] = [];
    for (let i = 0; i < centered.length - 1; i++) {
      if (centered[i] * centered[i + 1] <= 0) {
        zeroCrossings.push((t[i] + t[i + 1]) / 2);
      }
    }
    if (zeroCrossings.length >= 3) {
      let sumHalfT = 0;
      for (let i = 1; i < zeroCrossings.length; i++) {
        sumHalfT += zeroCrossings[i] - zeroCrossings[i - 1];
      }
      period = 2 * (sumHalfT / (zeroCrossings.length - 1));
    } else {
      period = 1.0;
    }
  }

  const maxVal = Math.max(...centered.map(Math.abs));
  const amplitude = maxVal;
  const frequency = period > 0 ? 1 / period : 0;
  const omega = 2 * Math.PI * frequency;

  return {
    amplitude,
    period: Math.max(0.01, period),
    frequency,
    omega,
    equilibrium: meanX,
  };
}

// 7. Statistical Error Calculator
export function calculateExperimentalError(experimental: number, theoretical: number) {
  const absoluteError = Math.abs(experimental - theoretical);
  const relativeErrorPercent = theoretical !== 0 ? (absoluteError / Math.abs(theoretical)) * 100 : 0;
  return {
    experimental,
    theoretical,
    absoluteError,
    relativeErrorPercent,
  };
}
