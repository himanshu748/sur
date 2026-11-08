import { describe, it, expect } from 'vitest';
import { candidateBeats, rsaByCycle, segments, analyzeCapture } from '../src/signals/analysis.mjs';
import { MetricCollector, csvLine, timestampNumber } from '../src/signals/metrics.mjs';

// All data in this file is SYNTHETIC. No SDK instance, API key or camera.
const trace = (seconds, wave) => Array.from({ length: seconds * 30 }, (_, i) => ({
  timestamp: Math.round(i * 1e6 / 30), value: wave(i / 30), stable: true, confidence: 90,
}));

describe('synthetic arterial beat candidates', () => {
  it('recovers 60 BPM without counting harmonics as extra beats', () => {
    const beats = candidateBeats(trace(20, (t) => Math.sin(2 * Math.PI * t) + 0.08 * Math.sin(4 * Math.PI * t)));
    expect(beats.length).toBeGreaterThanOrEqual(18);
    expect(beats.filter((b) => b.plausible).every((b) => Math.abs(b.bpm - 60) < 0.01)).toBe(true);
  });
  it('does not bridge a gap, or use an unstable/low-confidence trace', () => {
    const arterial = trace(20, (t) => Math.sin(2 * Math.PI * t));
    const beats = candidateBeats(arterial.filter((s) => s.timestamp < 8e6 || s.timestamp > 10e6));
    expect(beats.filter((b) => b.ibiMs === null)).toHaveLength(2);
    expect(candidateBeats(arterial.map((s) => ({ ...s, stable: false })))).toEqual([]);
    expect(candidateBeats(arterial.map((s) => ({ ...s, confidence: 0 })))).toEqual([]);
    expect(candidateBeats(trace(10, () => 1))).toEqual([]);
  });
  it('splits timestamp regressions instead of constructing negative intervals', () => {
    const part = trace(1, () => 0);
    expect(segments([...part, ...part])).toHaveLength(2);
  });
});

describe('synthetic cycle RSA', () => {
  const breath = trace(50, (t) => Math.cos(2 * Math.PI * t / 10));
  const beats = Array.from({ length: 50 }, (_, i) => ({ timestamp: i * 1e6,
    bpm: 60 + 6 * Math.sin(2 * Math.PI * i / 10), plausible: true, segment: 0 }));
  it('averages observed peak-to-trough HR inside complete measured breath cycles', () => {
    const cycles = rsaByCycle(beats, breath);
    expect(cycles.length).toBeGreaterThanOrEqual(3);
    for (const cycle of cycles) expect(cycle.amplitudeBpm).toBeCloseTo(11.4127, 3);
  });
  it('rejects cycles containing invalid intervals or multiple segments', () => {
    const invalid = beats.map((b, i) => ({ ...b, plausible: i % 5 !== 0 }));
    expect(rsaByCycle(invalid, breath)).toEqual([]);
    expect(rsaByCycle(beats.map((b, i) => ({ ...b, segment: i % 2 })), breath)).toEqual([]);
    expect(rsaByCycle(beats.filter((_, i) => i % 5 === 0), breath)).toEqual([]);
  });
  it('uses the actual breathing Measurement shape without invented confidence', () => {
    const sdkShape = breath.map(({ timestamp, value, stable }) => ({ timestamp, value, stable }));
    expect(rsaByCycle(beats, sdkShape).length).toBeGreaterThanOrEqual(3);
    expect(rsaByCycle(beats, sdkShape.map((s) => ({ ...s, stable: false })))).toEqual([]);
  });
  it('reports insufficient evidence explicitly', () => {
    const report = analyzeCapture({ arterial: [], upper: [], lower: [], pulse: [], hrv: [] });
    expect(report.meanExploratoryRsaBpm).toBeNull();
    expect(report.reliability).toContain('unverified');
  });
});

describe('SDK payload accounting with synthetic samples', () => {
  it('keeps every sample in overlapping windows exactly once, preserving HRV fields', () => {
    const c = new MetricCollector();
    const sample = (timestamp) => ({ timestamp: String(timestamp), value: 64, stable: true, confidence: 80 });
    c.ingest({ cardio: { pulseRate: [sample(20), sample(10)], hrv: [{ timestamp: 20, rmssd: 40, sdnn: 50, meanNn: 900, stable: true, confidence: 85 }] } });
    const added = c.ingest({ cardio: { pulseRate: [sample(10), sample(20), sample(30)] } });
    expect(added).toHaveLength(1);
    expect(c.series.pulse.map((s) => s.timestamp)).toEqual([10, 20, 30]);
    expect(c.series.hrv[0]).toMatchObject({ rmssd: 40, sdnn: 50, meanNn: 900 });
  });
  it('fails closed on undecoded, invalid and unsafe timestamps', () => {
    const c = new MetricCollector();
    expect(() => c.ingest(Buffer.from('not decoded'))).toThrow();
    expect(() => timestampNumber('9007199254740993')).toThrow();
    expect(() => c.ingest({ breathing: { upperTrace: [{ timestamp: 1, value: NaN }] } })).toThrow();
  });
  it('escapes commas, quotes, newlines and formula prefixes in hint text', () => {
    expect(csvLine({ hint: '=A1,"test"\nnext' })).toContain('"\'=A1,""test""\nnext"');
  });
});
