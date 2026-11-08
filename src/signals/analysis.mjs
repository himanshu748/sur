// Exploratory waveform analysis, not a validated beat detector.
export const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

export function quantile(xs, q) {
  if (!xs.length) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * q)];
}

// Preserve discontinuities: never invent intervals across invalid data or gaps.
export function segments(samples, { maxGapUs = 150_000, minConfidence = 40 } = {}) {
  const result = [];
  let current = [];
  let previous = -Infinity;
  for (const s of samples) {
    const valid = Number.isSafeInteger(s.timestamp) && Number.isFinite(s.value)
      && s.stable === true && (minConfidence === null
        || (Number.isFinite(s.confidence) && s.confidence >= minConfidence));
    if (!valid || s.timestamp <= previous || s.timestamp - previous > maxGapUs) {
      if (current.length) result.push(current);
      current = [];
    }
    if (valid) current.push(s);
    previous = s.timestamp;
  }
  if (current.length) result.push(current);
  return result;
}

export function peaks(samples, { minDistanceUs, radius = 2, prominenceFraction = 0.12 }) {
  if (samples.length < radius * 2 + 3) return [];
  const values = samples.map((s) => s.value);
  const span = quantile(values, 0.95) - quantile(values, 0.05);
  if (!(span > 0)) return [];
  const smooth = samples.map((s, i) => ({ ...s, value: mean(values.slice(
    Math.max(0, i - radius), Math.min(values.length, i + radius + 1))) }));
  const candidates = [];
  for (let i = radius + 1; i < smooth.length - radius - 1; i++) {
    const s = smooth[i];
    if (!(s.value > smooth[i - 1].value && s.value >= smooth[i + 1].value)) continue;
    const left = smooth.filter((p) => p.timestamp < s.timestamp && p.timestamp >= s.timestamp - minDistanceUs);
    const right = smooth.filter((p) => p.timestamp > s.timestamp && p.timestamp <= s.timestamp + minDistanceUs);
    if (!left.length || !right.length) continue;
    const prominence = s.value - Math.max(Math.min(...left.map((p) => p.value)), Math.min(...right.map((p) => p.value)));
    if (prominence >= span * prominenceFraction) candidates.push({ ...s, prominence });
  }
  // Nonmaximum suppression removes small ripples near the strongest peak.
  const chosen = [];
  for (const s of candidates.sort((a, b) => b.prominence - a.prominence)) {
    if (chosen.every((p) => Math.abs(s.timestamp - p.timestamp) >= minDistanceUs)) chosen.push(s);
  }
  return chosen.sort((a, b) => a.timestamp - b.timestamp);
}

export function candidateBeats(arterial) {
  return segments(arterial).flatMap((part, segment) => {
    const found = peaks(part, { minDistanceUs: 60_000_000 / 110, radius: 1 });
    return found.map((p, i) => {
      const ibiUs = i ? p.timestamp - found[i - 1].timestamp : null;
      const plausible = ibiUs !== null && ibiUs >= 60_000_000 / 110 && ibiUs <= 60_000_000 / 40;
      return { timestamp: p.timestamp, segment, ibiMs: ibiUs === null ? null : ibiUs / 1000,
        bpm: plausible ? 60_000_000 / ibiUs : null, plausible };
    });
  });
}

// Each cycle needs complete coverage and >=4 beat intervals. No gap interpolation.
export function rsaByCycle(beats, breath) {
  // upperTrace is Measurement (no confidence field). Its stable flag inherits
  // the breathing-rate verdict; do not invent a waveform confidence value.
  return segments(breath, { minConfidence: null }).flatMap((part) => {
    const boundaries = peaks(part, { minDistanceUs: 6_000_000, radius: 6 });
    return boundaries.slice(1).flatMap((end, i) => {
      const start = boundaries[i].timestamp;
      const duration = end.timestamp - start;
      if (duration < 8_000_000 || duration > 12_000_000) return [];
      const inside = beats.filter((b) => b.timestamp >= start && b.timestamp < end.timestamp);
      if (inside.length < 4 || inside.some((b) => !b.plausible)
        || new Set(inside.map((b) => b.segment)).size !== 1
        || inside[0].timestamp - start > 1_500_000
        || end.timestamp - inside.at(-1).timestamp > 1_500_000) return [];
      const bpms = inside.map((b) => b.bpm);
      return [{ startUs: start, endUs: end.timestamp, amplitudeBpm: Math.max(...bpms) - Math.min(...bpms), intervals: inside.length }];
    });
  });
}

export function analyzeCapture(series) {
  const beats = candidateBeats(series.arterial);
  const cycles = rsaByCycle(beats, series.upper);
  return {
    method: 'exploratory-arterial-peak-intervals',
    reliability: 'unverified; inspect live traces and repeat with an independent reference before claiming accuracy',
    sampleCounts: Object.fromEntries(Object.entries(series).map(([k, v]) => [k, v.length])),
    candidateBeats: beats.length,
    plausibleIntervals: beats.filter((b) => b.plausible).length,
    rejectedIntervals: beats.filter((b) => b.ibiMs !== null && !b.plausible).length,
    medianCandidateBpm: quantile(beats.filter((b) => b.plausible).map((b) => b.bpm), 0.5),
    eligibleBreathCycles: cycles.length,
    meanExploratoryRsaBpm: mean(cycles.map((c) => c.amplitudeBpm)),
    cycles, beats,
  };
}
