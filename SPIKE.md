# Day-one spike: blocked, RSA feasibility unresolved

**Decision: do not build the full app yet.** One real default-camera attempt with SmartSpectra 3.4.0 stopped after **45.6766 seconds** on SDK error **8 (`kProcessingFailed`)**, marked retryable by the SDK. It did not complete the requested three minutes. No retry was made, following the owner's stop-on-SDK-failure instruction.

## Observed evidence

The native binding loaded successfully on macOS arm64 with Node **24.22.2**. Capture used the documented `SmartSpectraSDK`, breathing/cardio bundles, `CameraSelection.default`, `useCamera`, `start`, `stopAsync` and `destroy` APIs. The owner explicitly approved the camera session and the disclosed automatic transmission of derived vitals to Presage for Insights. Optional telemetry was disabled; no upgrade or payment was made.

| Observation | Result |
| --- | --- |
| Metrics callbacks | 435 |
| Unique upper-chest samples | 544; none marked stable |
| Lower-abdominal samples | 0 |
| Breathing-rate samples | 3 |
| Arterial waveform samples | 0 |
| Pulse samples | 0 |
| HRV samples | 0; session shorter than the required 60-second window |
| Derived candidate beats / eligible breath cycles | 0 / 0 |
| Final state | Stop/destroy completed; process exited 1 |

The CSV records validation hints including chest not visible, face position/orientation, multiple/no faces and insufficient frame rate. Those warnings indicate capture conditions were unsuitable. **They do not establish the cause of `kProcessingFailed`.** No live preview was built for this headless spike. The error callback's free-text message was deliberately not retained, so the exact native failure cause remains unknown. We have not established whether cardio provisioning, capture conditions or another SDK/runtime issue caused the missing cardio outputs.

Raw evidence remains local and git-ignored: `captures/2026-11-08T07-47-41.294Z/signals.csv` and `analysis.json`. The CSV contains 1,325 rows: 773 validation, 544 upper trace, 3 breathing rate, 4 processing status, and 1 SDK error. The JSON preserves elapsed time, counts and the failed outcome. Do not publish these physiological capture files. No video was saved.

## Answer to the spike question

**We cannot yet determine whether beat-to-beat intervals are reliable enough to show within-breath heart-rate changes.** This attempt supplied no arterial data, so neither the peak detector nor RSA calculation was exercised on live cardio. The absence of data is not proof that the SDK cannot supply usable beat timing.

The experimental implementation detects arterial peaks, rejects unstable/low-confidence segments and gaps, limits candidate intervals to the documented pulse range (40–110 BPM), then measures the observed peak-to-trough candidate BPM in complete measured upper-chest cycles. Overlapping SDK packets are deduplicated per field by timestamp; all samples in each packet are considered. Breathing traces have `stable` but **no confidence field**; that verdict is inherited from breathing-rate stability. Arterial trace and HRV do carry confidence.

Signal intervals use the SDK's per-sample microsecond timestamps, preserved without inventing a clock conversion. The SDK payload schema documents those timestamps as epoch microseconds. Callback timestamps are also preserved. Receipt timing and the three-minute budget use monotonic `process.hrtime.bigint()`, with wall clock used only for file naming. Callback arrival time is never substituted for heartbeat timing.

**Fallback is also unresolved:** the proposed fallback is the SDK's 12-second average pulse trend aligned to measured breath phase, with RMSSD/SDNN per step. It is a smoothed proxy, not beat-to-beat RSA, and cannot support literal per-heartbeat tabla ticks. No pulse or HRV arrived here, so selecting that method now would also overstate the evidence. README states that no live method has been selected.

## Validation of the tooling

Local Node 24 runs passed **10 synthetic Vitest tests**, `npm run lint`, the CLI `--help` path and the noninteractive consent gate. Tests cover harmonic rejection on a constructed pulse trace, gaps, invalid samples, timestamp regressions, per-cycle peak-to-trough calculation, incomplete cycles, actual breathing-field shape, packet deduplication, HRV field preservation and CSV escaping. No synthetic data was substituted into the live run. Test and lint output is saved locally in `local-evidence/`.

`npm audit` is checked separately from camera feasibility. The minimatch override pins a patched release used by ESLint; lint/tests must pass with that resolution. GitHub Actions is configured for lint/tests only; no remote CI result is claimed. Full Electron UI, Web Audio, persisted pace, SVG/PNG export, embed page and SVG tests are deferred until the spike gate is resolved.

## Next experiment, only with a new go-ahead

1. Investigate `kProcessingFailed` using redacted SDK diagnostics and check that the existing free key permits cardio. Do not buy credits, change billing or open upstream issues.
2. Fix framing and sustained >=25 fps lighting/setup, then explicitly start one fresh 180-second run at six breaths/min. Display a preview in a later app phase; do not invent a headless preview now.
3. Require stable arterial, upper-chest, pulse and HRV outputs after their warm-up windows. Inspect sampling gaps and raw peak shape; test sensitivity to modest detector changes. Compare interval-derived average pulse with the SDK's averaged pulse, allowing for its window and delay.
4. Inspect at least ten complete breath cycles and the interval-derived heart-rate curve. Check the observed relationship to breath phase instead of assuming an in-phase result. An independent beat-timing reference is needed before claiming beat-interval accuracy; the camera trace alone cannot establish that.
5. Choose beat intervals only if the evidence supports them. Otherwise evaluate and explicitly label the pulse-trend/HRV proxy, including the possibility that its 12-second average cannot resolve the target cycle. If neither works, report that feasibility failed.

Two design constraints remain visible: 4.5 breaths/min is outside the SDK's documented **5–40/min** breathing/waveform range, and automatic Insights mean the SDK is not an offline-only data path. A local-only product promise cannot currently be made.

Sources checked 2026-11-08: [Node API](https://smartspectra.presagetech.com/docs/nodejs/api-reference.md), [metrics](https://smartspectra.presagetech.com/docs/nodejs/metrics.md), [payload schema](https://smartspectra.presagetech.com/docs/data-types.md), [measurement quality](https://smartspectra.presagetech.com/docs/measurement-quality.md), [model cards](https://smartspectra.presagetech.com/docs/model-cards-and-limitations.md), [automatic Insights](https://smartspectra.presagetech.com/docs/nodejs/llm-insights.md), [SDK privacy](https://presagetech.com/legal/privacy-policy). Error-code mapping was verified in the installed 3.4.0 `js/constants.js`.
