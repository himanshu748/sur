import { expect, it } from 'vitest';
import { redactDiagnostic } from '../src/diagnostics.mjs';

// All credentials below are synthetic test strings, never usable credentials.
it('removes literal and encoded synthetic secrets while keeping useful errors', () => {
  const secret = 'synthetic/key+example';
  const message = `Failed to load device keys; key=${secret}; encoded=${encodeURIComponent(secret)}`;
  const result = redactDiagnostic(message, [secret]);
  expect(result).toContain('Failed to load device keys');
  expect(result).not.toContain(secret);
  expect(result).not.toContain(encodeURIComponent(secret));
});

it('redacts credential assignments, bearer tokens, JWT shapes and private-key blocks', () => {
  const result = redactDiagnostic('api_key=synthetic-value Authorization: Bearer synthetic-token '
    + 'eyJsynthetic.payload.signature -----BEGIN PRIVATE KEY-----\nSYNTHETIC\n-----END PRIVATE KEY-----');
  for (const value of ['synthetic-value', 'synthetic-token', 'eyJsynthetic.payload.signature', 'SYNTHETIC']) {
    expect(result).not.toContain(value);
  }
  expect(result).toContain('[redacted');
});

it('bounds diagnostics and removes terminal escape sequences', () => {
  expect(redactDiagnostic('\x1b[31mFailed\x1b[0m')).toBe('Failed');
  expect(redactDiagnostic('z'.repeat(5000))).toHaveLength(4096);
});
