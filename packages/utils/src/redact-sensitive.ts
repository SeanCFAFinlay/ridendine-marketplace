// ==========================================
// LOG / AUDIT REDACTION (Phase 15 / IRR-027)
// Strip common PII and payment-adjacent patterns from free-text errors.
// ==========================================

/**
 * Redact emails, Stripe-style secret keys, and long digit runs (possible PAN fragments)
 * before writing to logs or durable audit payloads.
 */
export function redactSensitiveForLog(input: string, maxLen = 2000): string {
  let s = input.slice(0, maxLen);
  s = s.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi, '[email]');
  s = s.replace(/\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]+\b/gi, '[stripe_key]');
  s = s.replace(/\b(?:whsec|we_)_[A-Za-z0-9]+\b/gi, '[webhook_secret]');
  s = s.replace(/\b(?:pi|re|ch)_[A-Za-z0-9]+\b/g, (m) =>
    m.length > 12 ? `${m.slice(0, 8)}...[stripe_id]` : m
  );
  s = s.replace(/\b\d{13,19}\b/g, '[digits]');
  return s;
}
