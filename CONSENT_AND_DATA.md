# Consent and data

Sur is for relaxation and breathing practice. SmartSpectra metrics are wellness estimates, not medical devices.

## Before the camera starts

Running `npm run spike` shows the disclosure and requires typing `START`. Passing `--consent` explicitly acknowledges this disclosure for an operator-run capture. The default camera is scheduled to stop after three minutes; the terminal displays ON-AIR and a five-second inhale/exhale cue. Press **Ctrl+C** to stop early. macOS also controls camera permission and its camera indicator. Confirm the camera indicator goes out after stopping.

The spike measures upper-chest breathing, lower-abdominal breathing when available, an uncalibrated arterial waveform, pulse and HRV (RMSSD, SDNN and mean NN). It derives exploratory candidate beat intervals, not validated heartbeat events. No microphone is requested and Sur does not record video.

## What leaves the device

According to [Presage's SDK Privacy Policy, sections 3–4](https://presagetech.com/legal/privacy-policy), images, video, audio, facial landmarks and color data stay on-device. **Derived measurements are automatically sent to Presage for AI Insights**, with session identifiers and request metadata. Sur makes no additional on-demand prompts. The [Node Insights guide](https://smartspectra.presagetech.com/docs/nodejs/llm-insights.md) describes automatic snapshots after pulse stabilizes, later as breathing/HRV stabilize, then every 60 seconds. We found no documented Node option to disable these automatic requests.

Authentication/model delivery sends credentials, attestation, hashed device identifiers and technical information; Presage receives the request IP. Session usage records also leave the device. Sur sets `enableTelemetry: false` to disable optional aggregate diagnostics. [Telemetry documentation](https://smartspectra.presagetech.com/docs/telemetry-and-privacy.md) describes those diagnostics; disabling them does not disable authentication, model delivery or Insights. This is **not an offline-only SDK**. These are vendor disclosures, not a network audit of the native runtime.

The SDK policy states Insights retention lasts for the developer account's lifetime plus up to 60 days after closure; usage records up to 365 days; backups up to 90 days. Legal/security exceptions apply. The policy explains deletion requests and the information needed to identify a session. Local deletion does not delete Presage's records. See the [SDK policy](https://presagetech.com/legal/privacy-policy) and [SDK terms](https://presagetech.com/legal/terms-of-service).

## What Sur stores and how to delete it

**Day-one spike exception:** explicit capture stores physiological sample CSV and analysis JSON locally in `captures/<run>/`, with owner-only directory/file permissions. They remain until you delete that folder. No screenshots, recordings or captures are uploaded by Sur. These folders are git-ignored. Your key stays in `.env` (also ignored); delete it to remove the local key, and use the Presage portal to revoke it if needed.

The planned app will retain only the chosen pace number and user-exported SVG/PNG files locally, with a delete/reset control. That app and its deletion controls are not built yet. The spike does not save a selected pace or create guide exports. Device backups and cloud-sync settings may retain local files independently of Sur; this folder is under Documents, so review your own sync settings.

Reviewed against Presage's documentation on 2026-11-08. Recheck before app release.
