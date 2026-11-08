// Call before persisting or displaying exception text. Never log SDK config objects.
export function redactDiagnostic(value, secrets = []) {
  let text = String(value ?? 'No diagnostic message supplied');
  for (const secret of secrets.filter((s) => typeof s === 'string' && s.length)) {
    text = text.replaceAll(secret, '[redacted]').replaceAll(encodeURIComponent(secret), '[redacted]');
  }
  return text
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[redacted-private-key]')
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-token]')
    .replace(/(api[_ -]?key|authorization|access[_ -]?token|refresh[_ -]?token|password|secret)(["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi, '$1$2[redacted]')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[redacted-id]')
    .replace(/[0-9a-f]{64,}/gi, '[redacted-hex]')
    // eslint-disable-next-line no-control-regex -- Strip ANSI controls from untrusted SDK error text.
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .slice(0, 4096);
}
