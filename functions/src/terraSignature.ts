import { createHmac, timingSafeEqual } from 'crypto';

// Terra signs every webhook with `terra-signature: t=<unix>,v1=<hex>` where the
// signature is HMAC-SHA256 of `${t}.${rawBody}` keyed by the destination signing
// secret. Verification REQUIRES the raw, unaltered request body — any reparse /
// re-serialize changes the bytes and fails the check. See:
// https://docs.tryterra.co/.../webhooks (signature verification recipe).

interface ParsedSignature {
  timestamp: string;
  signatures: string[];
}

function parseHeader(header: string): ParsedSignature | null {
  const parts = header.split(',').map((p) => p.trim());
  let timestamp = '';
  const signatures: string[] = [];
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (key === 't') timestamp = value;
    else if (key === 'v1') signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return null;
  return { timestamp, signatures };
}

function safeEqualHex(a: string, b: string): boolean {
  // timingSafeEqual throws on length mismatch — guard first, still constant-time
  // for equal-length inputs (the case that matters for a forged-but-plausible sig).
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Verifies a Terra webhook signature.
 *
 * @param rawBody  the exact request body bytes (string or Buffer) — never re-serialized JSON
 * @param header   the `terra-signature` header value
 * @param secret   the destination signing secret
 */
export function verifyTerraSignature(
  rawBody: string | Buffer,
  header: string | undefined,
  secret: string,
): boolean {
  if (!header || !secret) return false;
  const parsed = parseHeader(header);
  if (!parsed) return false;

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
  const expected = createHmac('sha256', secret).update(`${parsed.timestamp}.${body}`).digest('hex');

  // A payload may carry several v1 signatures during secret rotation — accept if any matches.
  return parsed.signatures.some((sig) => safeEqualHex(sig, expected));
}
