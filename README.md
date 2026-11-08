# Sur

Find your resonant breathing pace with a tanpura you play with your breath and heartbeat.

Sur is a planned desktop breathing-practice app for people who want a calm way to explore their breathing rhythm, then take a camera-free animated guide away with them. SmartSpectra supplies live camera estimates; a synthesized tanpura and a visual lock cue will respond to breath and heart rhythm.

**Current state: day-one headless spike only. The live attempt failed early; the Electron app is not built.** See [SPIKE.md](SPIKE.md) for evidence and the unresolved RSA decision. Development is paused pending the owner's go-ahead.

A separately approved [SDK investigation](SDK_INVESTIGATION.md) found a usage-verification network failure and native teardown crash. The account remains Free; cardio provisioning has not been verified. The spike now preserves redacted SDK error messages for diagnosis.

*Demo GIF placeholder — replace with a real recording after the app works. No demo exists yet.*

## Run the spike

Use macOS Apple Silicon with a stable camera. Node **24 LTS** is recommended (`.nvmrc`); the SDK requires Node >=20. The development tools require Node >=22.14; use Node 24 to run the full toolchain.

```sh
git clone https://github.com/himanshu748/sur.git
cd sur
npm install
cp .env.example .env
# Edit .env locally: SMARTSPECTRA_API_KEY=<your existing key>
npm start
```

`npm start` currently launches `scripts/spike.mjs`, **not Electron**. Read the disclosure, type `START`, then follow five seconds in / five seconds out for three minutes. Press **Ctrl+C** to stop. `npm run spike -- --help` prints options without loading the native SDK or starting the camera. A noninteractive run requires explicit `--consent` after reading [CONSENT_AND_DATA.md](CONSENT_AND_DATA.md).

Get an existing free-trial API key from the [Presage portal](https://physiology.presagetech.com/). Cardio access is required. An API key and internet access are needed for SDK authentication/model delivery and automatic Insights. Native runtimes for several platforms are downloaded by npm (hundreds of MB). Never add a payment method or upgrade just to run this project; stop on quota/access failures.

Local evidence goes to `captures/<run>/signals.csv` and `analysis.json`. CSV keeps every unique timestamped sample across overlapping SDK windows, callback timestamps, monotonic receive timestamps, validation hints and derived **candidate** beat intervals. No captured video is saved. Blank fields mean unavailable, not zero.

## Planned experience (not implemented)

- **Find:** guide 6.5, 6.0, 5.5, 5.0 and a provisional 4.5 breaths/min step, about two minutes each with rests. Compare eligible per-breath peak-to-trough heart-rate swings, show SDK RMSSD/SDNN alongside a simple step bar chart, and save the selected pace. **4.5 is outside the SDK's documented breathing range and cannot currently be scored as a supported measurement.** Resolve this before building Find.
- **Practice:** pace at the saved rate. Web Audio will synthesize a Pa–Sa–Sa–Sa tanpura and soft tabla-like heartbeat ticks; breath will shape brightness/volume and an evidenced phase match will add harmony. Visual cues will carry the same information without sound.
- **Export:** stop and release the camera first, then create a self-contained animated SVG and static PNG using smoothed timing from eligible measured cycles. An example embed page will accompany the export. No export implementation or sample export exists yet.

The Electron implementation will use the documented `/main`, `/preload` and `/renderer` entry points, context isolation, scoped camera permission, `NSCameraUsageDescription`, and `worker-src 'self' blob:`. Consent, on-air state, stop control, keyboard access and reduced-motion behavior are acceptance requirements, not completed features.

## RSA method and limits

**No live RSA method has been verified or selected.** The spike implements exploratory peak detection on `cardio.arterialPressureTrace`, then interval-derived candidate BPM. It averages the observed peak-to-trough BPM within complete upper-chest waveform cycles, excluding unstable samples, gaps and implausible intervals. Waveform peaks are candidate beats, not an SDK beat-event API. Synthetic tests show the arithmetic works on constructed signals; they do not establish camera accuracy or phase alignment.

The attempted run returned no arterial, pulse or HRV samples. If beat intervals prove unsuitable after a successful capture, the proposed fallback is the SDK's **12-second averaged pulse trend** aligned to measured breath phase, with SDK HRV per step. That fallback is a smoothed proxy, not beat-to-beat RSA, and is also unverified. It must not generate fake per-heartbeat ticks or imply instantaneous heart rate.

Per [Presage's model cards](https://smartspectra.presagetech.com/docs/model-cards-and-limitations.md): breathing rate averages 30 seconds and is supported at **5–40/min**; pulse averages 12 seconds at **40–110 BPM**; HRV needs a full **60-second** window. Upper/lower breathing waveforms inherit breathing stability; lower trace needs waistline visibility. Camera and subject must stay still, with good even light, face/chest visible, no talking, and plain non-dark clothing. Live validation hints appear in the terminal. High confidence alone cannot rule out motion artifacts.

The background motivation is [Lehrer and Gevirtz (2014), *Frontiers in Psychology*](https://doi.org/10.3389/fpsyg.2014.00756), which discusses breathing near six breaths/min and individual resonance differences. A related [2014 review](https://doi.org/10.3389/fpsyg.2014.00890) describes a roughly 4.5–6.5 range. Sur's step range is exploratory, not a personal recommendation or a validated result. SmartSpectra metrics are wellness estimates, not medical devices.

## Consent and data

The camera starts only after explicit consent (`START` or `--consent`). ON-AIR and Ctrl+C stop guidance stay visible. The spike stores physiological CSV/analysis files locally until you delete `captures/`; this is a development exception to the planned app's pace-number-and-exports-only retention. The key is in ignored `.env`. No camera video/audio is recorded by Sur.

Per Presage's [SDK privacy policy](https://presagetech.com/legal/privacy-policy), camera images and face-derived data stay on-device, but derived vitals are automatically sent to Presage for AI Insights. Authentication/model delivery and usage requests also leave the device. Optional telemetry is disabled; this does **not** disable Insights. Vendor retention and deletion rules apply separately from local files. This disclosure follows vendor documentation; no native network audit was performed. Read [CONSENT_AND_DATA.md](CONSENT_AND_DATA.md) for the data flow, retention, deletion, [SDK telemetry](https://smartspectra.presagetech.com/docs/telemetry-and-privacy.md) and [terms](https://presagetech.com/legal/terms-of-service).

## Checks and contribution status

```sh
npm run lint
npm test
```

Vitest tests use **labelled synthetic signals only**, without a camera or API key. They cover interval detection, per-cycle RSA, invalid segments, overlapping SDK packets and CSV escaping. SVG export tests are deferred with the export implementation. GitHub Actions is configured for lint and synthetic tests only, with no secrets and no camera runs.

The [demo script](DEMO_SCRIPT.md) is a future two-minute recording plan. No video has been recorded/uploaded. No DEV entry has been posted. The [Presage SmartSpectra SDK Challenge](https://dev.to/events/143) closes **2026-11-22 23:59 PST** (2026-11-23 13:29 IST); eligibility and submission requirements must be rechecked before submission. Its judging criteria are technology use, usability and originality; live SDK behavior and consent are required evidence.

## Credits and license

Sur's code is [MIT licensed](LICENSE). SmartSpectra is Presage Technologies' SDK and has its own license and [terms](https://presagetech.com/legal/terms-of-service); Sur's MIT license does not relicense it. SDK integration follows the [Node docs](https://smartspectra.presagetech.com/docs/nodejs.md), [metrics guide](https://smartspectra.presagetech.com/docs/nodejs/metrics.md), [payload schema](https://smartspectra.presagetech.com/docs/data-types.md) and [Electron sample](https://github.com/Presage-Security/SmartSpectra/tree/main/nodejs/samples/electron-quickstart). Audio synthesis and artwork remain planned; no third-party audio samples have been added.
