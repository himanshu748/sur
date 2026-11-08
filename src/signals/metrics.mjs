// Field paths follow the SDK 3.4.0 metrics guide and generated protobuf schema.
export const fields = {
  upper: ['breathing', 'upperTrace'], lower: ['breathing', 'lowerTrace'],
  breathingRate: ['breathing', 'rate'], arterial: ['cardio', 'arterialPressureTrace'],
  pulse: ['cardio', 'pulseRate'], hrv: ['cardio', 'hrv'],
};

export function timestampNumber(value) {
  const n = Number(value?.toString());
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Invalid SDK sample timestamp');
  return n;
}

export class MetricCollector {
  series = Object.fromEntries(Object.keys(fields).map((key) => [key, []]));
  latest = new Map();
  ingest(metrics) {
    if (!metrics || Buffer.isBuffer(metrics)) throw new Error('SDK metrics did not decode');
    const added = [];
    for (const [name, [group, field]] of Object.entries(fields)) {
      const samples = metrics[group]?.[field] ?? [];
      for (const raw of [...samples].sort((a, b) => timestampNumber(a.timestamp) - timestampNumber(b.timestamp))) {
        const timestamp = timestampNumber(raw.timestamp);
        // SDK events are windowed slices. Keep each timestamp once per signal.
        if (timestamp <= (this.latest.get(name) ?? -1)) continue;
        const sample = { timestamp, stable: raw.stable === true, confidence: raw.confidence,
          ...(name === 'hrv' ? { rmssd: raw.rmssd, sdnn: raw.sdnn, meanNn: raw.meanNn } : { value: raw.value }) };
        if (!(name === 'hrv' ? [sample.rmssd, sample.sdnn, sample.meanNn] : [sample.value]).every(Number.isFinite)) {
          throw new Error('SDK returned a non-finite metric');
        }
        this.latest.set(name, timestamp);
        this.series[name].push(sample);
        added.push({ name, ...sample });
      }
    }
    return added;
  }
}

export const csvColumns = ['kind', 'received_monotonic_us', 'callback_timestamp_us', 'sample_timestamp_us',
  'value', 'confidence', 'stable', 'rmssd_ms', 'sdnn_ms', 'mean_nn_ms', 'candidate_ibi_ms',
  'candidate_bpm', 'candidate_plausible', 'code', 'hint'];

export function csvLine(row) {
  return csvColumns.map((key) => {
    let s = row[key] === undefined || row[key] === null ? '' : String(row[key]);
    // Hints are untrusted text; prevent spreadsheet formulas on CSV opening.
    if ((key === 'hint' || key === 'kind') && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  }).join(',') + '\n';
}
