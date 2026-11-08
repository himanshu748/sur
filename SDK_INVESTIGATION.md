# SDK investigation — 2026-11-08

**Blocked by a live usage-verification network error and a native teardown crash. Cardio access on the existing Free key is not verified.** The original code-8 failure cannot be diagnosed retroactively because its message was not retained. No upgrade, key regeneration, billing change or full-app work was performed.

## Free-key access

The signed-in Presage portal shows an active key on **Free**. Its dashboard and settings expose neither a cardio entitlement verdict nor a remaining-credit counter. The displayed “100 Free API Credits” is promotional text, not a verified remaining balance.

Presage's current [FAQ](https://presagetech.com/) says the free trial includes all SDK features; the [SDK pricing page](https://presagetech.com/smartspectra-sdk) advertises the full SDK trial without a credit card. This supports expecting cardio to be included in the trial. It does **not** prove this particular key's server-side provisioning or remaining quota. No explicit authentication rejection, quota denial or cardio-specific access denial was observed in this investigation.

## Checks and observed results

| Check | Observation | Limit |
| --- | --- | --- |
| Installed packages | JS binding and darwin-arm64 runtime are 3.4.0; npm latest is 3.4.0 | No SDK upgrade attempted |
| Headless setup | Installed binding calls automatic preconfigure; SDK cache directory exists and is writable | Does not prove device registration/model delivery succeeded |
| No-camera custom input | Separate 20- and 60-second observation budgets; no frames submitted, no metrics or Insights callbacks; clean stop/destroy | Remained `kStarting`; cannot verify measurement access |
| Approved live diagnostic | Default camera, explicit 1280×720 / 30 fps request, breathing + cardio bundles, optional telemetry off | Camera's actual sustained frame rate was not measured |
| Terminal failure | At 45.565 seconds from probe entry: **code 5, `kNetworkError`**, retryable; message: “A network error occurred during SmartSpectra processing.” | This differs from the original code 8; identical root cause is not established |
| Native evidence | `auth_client.cc:441`: **Usage verification failed. Status code: 0** | No server response/body or endpoint was exposed; cannot identify DNS/TLS/transport/server cause |
| Teardown | `stopAsync()` returned, then native runtime aborted during the destroy phase: **`std::__1::system_error: mutex lock failed: Invalid argument`**, process **SIGABRT** | `destroy()` did not complete; no further SDK sessions were started |
| Public connectivity | Portal login and Node docs returned HTTP 200, TLS verification result 0; DNS resolved; common proxy/CA override environment variables unset | Does not test the SDK's authenticated/pinned transport |

The native runtime also warned that the configured physiology model path could not be resolved and it would fall back to remote delivery. That is a warning, not proof of a missing entitlement. Camera auto-exposure/white-balance/focus capability warnings also appeared. The observed terminal error explicitly names network processing, not framing or a paid-feature requirement.

The [Node migration guide](https://smartspectra.presagetech.com/docs/nodejs/migration-guide.md) documents ongoing entitlement checks and distinguishes network failure from explicit quota denial. The [Electron sample's troubleshooting](https://github.com/Presage-Security/SmartSpectra/blob/main/nodejs/samples/electron-quickstart/README.md) discusses cardio provisioning for “Failed to load device keys,” but that message was **not** observed here. Do not apply that diagnosis without evidence.

## Evidence and repair

Redacted logs remain ignored under `local-evidence/diagnostics/`, with runs `2026-11-08T08-06-17.567Z` and `2026-11-08T08-07-20.130Z` for no-frame probes, and `2026-11-08T08-09-41.930Z` for the approved camera diagnostic. The camera diagnostic saved neither video nor waveform/metric values. Its final sample-count summary was lost when the native process aborted; no counts are inferred from that absence. Saved logs were checked for the local API-key value before packaging.

The spike previously discarded SDK error messages. It now records a redacted message with the error code and retryability in CSV/analysis JSON, and reports redacted initialization errors. Added synthetic tests cover literal/encoded secrets, common token formats, private-key blocks and bounded messages with ANSI escape removal. Native debug logging remains off in the normal spike.

## Next actionable step

Ask Presage to confirm this account's Free-key cardio provisioning and investigate the usage-verification failure plus teardown crash, using the prepared **unsent** support request and redacted evidence. Do not send the API key. Do not upgrade or repeatedly retry the camera. A later approved capture is needed to establish live cardio and then RSA feasibility. The original spike gate remains closed.
