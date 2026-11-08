# Day-one spike: blocked

**Do not build the full app yet. RSA feasibility is unresolved.** The real default-camera attempt stopped after **45.6766 seconds**, before the requested three minutes, on SDK error **8 (`kProcessingFailed`, retryable)**. No retry or synthetic substitution was made.

## Evidence

SmartSpectra **3.4.0** loaded and ran on macOS arm64 with Node **24.22.2**. The owner explicitly approved camera capture and the documented automatic transmission of derived vitals to Presage for Insights. Optional telemetry was disabled. The documented default-camera and breathing/cardio bundle APIs were used.

| Captured output | Count |
| --- | ---: |
| Metrics callbacks | 435 |
| Unique upper-chest samples | 544; none stable |
| Breathing-rate samples | 3 |
| Lower trace / arterial trace / pulse / HRV | 0 each |
| Candidate beats / eligible breath cycles | 0 each |

The SDK emitted framing, chest visibility, multiple/no-face, orientation and frame-rate warnings. These show unsuitable capture conditions, **not the cause of the processing error**. The raw error message was withheld to protect credentials, so the native failure cause is unknown. Cardio access/provisioning has not been established. HRV's 60-second window was never reached.

Stop/destroy completed and the process exited 1. Local, git-ignored evidence is in `captures/2026-11-08T07-47-41.294Z/signals.csv` and `analysis.json`. The CSV has 1,325 rows, including validation and processing status. No video was saved; captures and the key are excluded from commits.

## Can we see within-breath heart-rate changes?

**Not established.** No arterial samples arrived, so live beat intervals could not be evaluated. This does not prove the SDK cannot supply them.

The exploratory algorithm detects arterial peaks, derives candidate BPM from intervals, then averages observed peak-to-trough BPM within complete measured chest cycles. It rejects unstable segments, gaps and intervals outside 40–110 BPM. Breathing traces use their inherited `stable` verdict; they have no confidence field of their own. Packet samples are deduplicated by timestamp. Signal timing preserves SDK microsecond timestamps; receipt timing and the capture budget use monotonic `process.hrtime.bigint()`.

**No live RSA method has been selected.** The proposed fallback—12-second averaged pulse trend aligned to breath phase, plus SDK RMSSD/SDNN per step—is also unverified because no pulse/HRV arrived. It is a smoothed proxy and cannot support literal heartbeat ticks. README makes this distinction explicit.

## Tooling checks

- **Passed locally:** 10 labelled synthetic Vitest tests, lint, CLI help, noninteractive consent gate, secret/history and file-size checks; npm audit reports zero vulnerabilities. Logs are in ignored `local-evidence/`.
- **Remote CI blocked:** [Actions run](https://github.com/himanshu748/sur/actions/runs/42460785554) never started. GitHub reports the account is locked due to a billing issue. No billing changes were made.
- **Deferred:** Electron UI, audio, saved pace, SVG/PNG export, embed page and SVG tests.

## Next step requires go-ahead

Investigate the processing error with redacted diagnostics and confirm existing free-key cardio access. Then, only with fresh capture approval, repeat 180 seconds with stable framing and >=25 fps. Inspect stable cardio/breath outputs, gaps, peak shape and at least ten complete breath cycles before choosing a method. Independent beat-timing reference data would be needed to establish interval accuracy.

Preserve two constraints: **4.5 breaths/min is outside the SDK's documented 5–40 range**, and automatic Insights prevent an offline-only privacy claim.

Sources checked 2026-11-08: [metrics](https://smartspectra.presagetech.com/docs/nodejs/metrics.md), [payload schema](https://smartspectra.presagetech.com/docs/data-types.md), [model cards](https://smartspectra.presagetech.com/docs/model-cards-and-limitations.md), [Insights](https://smartspectra.presagetech.com/docs/nodejs/llm-insights.md), [SDK privacy](https://presagetech.com/legal/privacy-policy). Error mapping was checked in installed SDK 3.4.0 `js/constants.js`.
