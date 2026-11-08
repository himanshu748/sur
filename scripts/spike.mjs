#!/usr/bin/env node
import { mkdir, open, writeFile, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import dotenv from 'dotenv';
import { MetricCollector, csvColumns, csvLine } from '../src/signals/metrics.mjs';
import { analyzeCapture } from '../src/signals/analysis.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const durationMs = 180_000;
const monoUs = () => Number(process.hrtime.bigint() / 1000n);
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Sur live spike: npm run spike [-- --consent]\n180 seconds, default camera, 6 breaths/min. Ctrl+C stops.\n--consent acknowledges CONSENT_AND_DATA.md; otherwise type START interactively.');
  process.exit(0);
}
if (args.some((a) => a !== '--consent')) {
  console.error('Unknown option. Use --help.'); process.exit(1);
}
dotenv.config({ path: resolve(root, '.env'), quiet: true });
const apiKey = process.env.SMARTSPECTRA_API_KEY?.trim();
if (!apiKey) {
  console.error('Missing SMARTSPECTRA_API_KEY. Set it in local .env. Camera remains off.');
  process.exit(1);
}
// Do not emit exception messages, native debug logs, buffers, or configuration containing credentials.
const redact = (text) => String(text).replaceAll(apiKey, '[redacted]');
console.log(`Sur — three-minute LIVE camera spike (not synthetic).
Measures breathing waveforms, candidate pulse timing, pulse and HRV.
Processing uses Presage's SDK. Optional telemetry is disabled; authentication,
model delivery and usage traffic still contact Presage. The SDK automatically
sends derived vitals to Presage for AI Insights; Sur makes no extra prompts.
Presage retains Insights while the developer account is active, then up to
60 days after closure (with policy exceptions and backup retention).
See CONSENT_AND_DATA.md and https://presagetech.com/legal/privacy-policy.
This spike stores local CSV + analysis JSON until you delete captures/.
No video/audio is recorded. Sur sends no captures to GitHub or DEV.
SmartSpectra metrics are wellness estimates, not medical devices.
Use a stable camera, even light, plain non-dark clothing; face/chest visible.
Breathe comfortably: five seconds in, five seconds out; do not force it.
ON-AIR will appear after start; Ctrl+C stops the camera at any time.`);
if (!args.includes('--consent')) {
  if (!stdin.isTTY) { console.error('Camera remains off. Run interactively to consent, or explicitly pass --consent.'); process.exit(1); }
  const rl = createInterface({ input: stdin, output: stdout });
  let answer;
  try { answer = await rl.question('Type START to consent and turn on the camera: '); }
  finally { rl.close(); }
  if (answer !== 'START') { console.log('Camera remains off.'); process.exit(0); }
}

let sdk, csv, timer, pacer, stopping;
let reason = 'completed';
let failed = false;
let startedUs;
let queue = Promise.resolve();
let outputError = false;
let metricsEvents = 0;
let validationCode;
const sdkErrors = [];
const collector = new MetricCollector();
const stamp = new Date().toISOString().replaceAll(':', '-'); // filename only; never signal timing
const dir = resolve(root, 'captures', stamp);
const write = (row) => {
  queue = queue.then(() => csv.write(redact(csvLine(row)))).catch(() => {
    if (!outputError) { outputError = true; void finish('csv-write-failed', true); }
  });
};
const eventRow = (kind, ts, rest = {}) => ({ kind, received_monotonic_us: monoUs(), callback_timestamp_us: ts, ...rest });

async function finish(why, error = false) {
  if (stopping) return stopping;
  reason = why; failed ||= error;
  stopping = (async () => {
    clearTimeout(timer); clearInterval(pacer);
    console.log('STOPPING — releasing camera…');
    try { await sdk?.stopAsync(); }
    catch { failed = true; console.error('SDK stop failed; attempting destroy.'); }
    try { await sdk?.destroy(); }
    catch { failed = true; console.error('SDK destroy failed; verify the camera LED is off.'); }
    const stoppedUs = monoUs();
    const analysis = analyzeCapture(collector.series);
    if (csv) {
      for (const b of analysis.beats) write(eventRow('candidate_beat', '', { sample_timestamp_us: b.timestamp,
        candidate_ibi_ms: b.ibiMs, candidate_bpm: b.bpm, candidate_plausible: b.plausible }));
      await queue;
      await csv.close();
    }
    await writeFile(resolve(dir, 'analysis.json'), JSON.stringify({ source: 'live-camera', sdkVersion: '3.4.0',
      requestedDurationSeconds: 180, elapsedSeconds: startedUs ? (stoppedUs - startedUs) / 1e6 : 0,
      reason, failed: failed || outputError, metricsEvents, sdkErrors, ...analysis }, null, 2), { mode: 0o600 });
    console.log(`Capture stopped. Local evidence: ${dir}\nMetrics events: ${metricsEvents}; candidate beats: ${analysis.candidateBeats}; eligible cycles: ${analysis.eligibleBreathCycles}.\nReliability remains unverified. See analysis.json; do not infer success from a file alone.`);
    process.exitCode = failed || outputError || metricsEvents === 0 ? 1 : why === 'interrupted' ? 130 : 0;
  })();
  return stopping;
}

try {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(resolve(root, 'captures'), 0o700);
  csv = await open(resolve(dir, 'signals.csv'), 'wx', 0o600);
  await csv.write(csvColumns.join(',') + '\n');
  const { SmartSpectraSDK, CameraSelection, breathingMetrics, cardioMetrics, decodeMetrics, SmartSpectraLogLevel } = await import('@smartspectra/node-sdk');
  sdk = new SmartSpectraSDK({ apiKey, requestedMetrics: [...breathingMetrics, ...cardioMetrics],
    enableTelemetry: false, logLevel: SmartSpectraLogLevel.kNone });
  sdk.on('validationStatus', (code, ts, hint) => {
    write(eventRow('validation', ts, { code, hint }));
    if (code !== validationCode) { validationCode = code; console.log(`Validation ${code}: ${redact(hint)}`); }
  });
  sdk.on('processingStatus', (code) => write(eventRow('processing', '', { code })));
  sdk.on('error', (code, _message, retryable) => {
    sdkErrors.push({ code, retryable });
    write(eventRow('sdk_error', '', { code, hint: `retryable=${retryable}; no automatic retry` }));
    console.error(`SDK error code ${code}. Stopping; raw message withheld to protect credentials.`);
    void finish('sdk-error', true);
  });
  sdk.on('metrics', (buffer, ts) => {
    try {
      metricsEvents++;
      for (const s of collector.ingest(decodeMetrics(buffer))) {
        write(eventRow(s.name, ts, { sample_timestamp_us: s.timestamp, value: s.value, stable: s.stable,
          confidence: s.confidence, rmssd_ms: s.rmssd, sdnn_ms: s.sdnn, mean_nn_ms: s.meanNn }));
      }
    } catch { console.error('SDK metrics payload failed validation. Stopping.'); void finish('metrics-decode-failed', true); }
  });
  process.on('SIGINT', () => { void finish('interrupted'); });
  process.on('SIGTERM', () => { void finish('terminated'); });
  sdk.useCamera(CameraSelection.default);
  startedUs = monoUs();
  timer = setTimeout(() => { void finish('completed'); }, durationMs);
  sdk.start();
  if (!stopping) {
    console.log('ON-AIR — camera requested. INHALE gently (5 seconds). Ctrl+C: STOP.');
    pacer = setInterval(() => {
      const seconds = Math.floor((monoUs() - startedUs) / 1e6);
      console.log(`ON-AIR ${seconds}/180s — ${Math.floor(seconds / 5) % 2 ? 'EXHALE' : 'INHALE'} gently. Ctrl+C: STOP.`);
    }, 5000);
  }
} catch {
  console.error('Spike initialization failed. No retry or synthetic fallback. Exception text withheld to protect credentials.');
  if (csv) await finish('initialization-failed', true);
  else process.exitCode = 1;
}
