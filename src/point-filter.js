const TAU = 2 * Math.PI;

function alpha(dt, cutoff) {
  if (dt <= 0) return 1;
  const tau = 1 / (TAU * cutoff);
  return dt / (tau + dt);
}

function createAxisState() {
  return {
    value: null,
    derivative: null
  };
}

function filterAxis(state, raw, dt, minCutoff, beta, dCutoff) {
  if (state.value === null) {
    state.value = raw;
    state.derivative = 0;
    return raw;
  }

  const rawDerivative = (raw - state.value) / dt;
  const aDerivative = alpha(dt, dCutoff);
  const smoothedDerivative = aDerivative * rawDerivative
    + (1 - aDerivative) * state.derivative;
  state.derivative = smoothedDerivative;

  const adaptiveCutoff = minCutoff + beta * Math.abs(smoothedDerivative);
  const aValue = alpha(dt, adaptiveCutoff);
  const smoothedValue = aValue * raw + (1 - aValue) * state.value;
  state.value = smoothedValue;

  return smoothedValue;
}

export function createPointFilter({
  minCutoff = 1.0,
  beta = 0.007,
  dCutoff = 1.0
} = {}) {
  let prevTimestamp = null;
  const xState = createAxisState();
  const yState = createAxisState();

  return {
    filter(x, y, timestamp) {
      if (prevTimestamp === null || xState.value === null) {
        xState.value = x;
        yState.value = y;
        xState.derivative = 0;
        yState.derivative = 0;
        prevTimestamp = timestamp;
        return { x, y };
      }

      const dt = (timestamp - prevTimestamp) / 1000;
      if (dt <= 0) {
        return { x: xState.value, y: yState.value };
      }

      prevTimestamp = timestamp;

      const filteredX = filterAxis(xState, x, dt, minCutoff, beta, dCutoff);
      const filteredY = filterAxis(yState, y, dt, minCutoff, beta, dCutoff);

      return { x: filteredX, y: filteredY };
    },

    reset() {
      xState.value = null;
      yState.value = null;
      xState.derivative = null;
      yState.derivative = null;
      prevTimestamp = null;
    }
  };
}
