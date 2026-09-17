import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signed QR payloads.
 *
 * The QR code carries a compact, HMAC-signed token — not a bare ticket ID —
 * so a payload edited by hand fails the signature check before it ever reaches
 * the database. The signature is a *cheap rejection*, not proof of validity:
 * a token that verifies is still looked up and re-validated against the live
 * ticket record. The server record is the only source of truth.
 *
 * In production the secret comes from ACL_QR_SECRET (a KMS-held key) and the
 * same signing routine runs in the ticketing service that issues e-tickets.
 */
const SECRET = process.env.ACL_QR_SECRET ?? "acl-demo-signing-key-rotate-in-production";
const VERSION = "ACLQR1";

export interface QrPayload {
  /** Ticket ID, e.g. ACL-VIP-000482 */
  t: string;
  /** Event ID the ticket was issued for. */
  e: string;
  /** Issued-at epoch ms. */
  i: number;
  /** Per-ticket nonce; makes every QR image unique even for identical tiers. */
  n: string;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(body: string): string {
  return b64url(createHmac("sha256", SECRET).update(body).digest());
}

export function newNonce(): string {
  return b64url(randomBytes(9));
}

/** Build the string encoded into a ticket's QR image. */
export function issueQrToken(ticketId: string, eventId: string, nonce: string): string {
  const payload: QrPayload = { t: ticketId, e: eventId, i: Date.now(), n: nonce };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${VERSION}.${body}.${sign(body)}`;
}

export type QrDecode =
  | { kind: "SIGNED"; payload: QrPayload }
  | { kind: "PLAIN"; ticketId: string }
  | { kind: "FORGED"; detail: string }
  | { kind: "MALFORMED"; detail: string };

/**
 * Decode whatever came off the camera or the manual-entry field.
 *
 * - A well-formed signed token with a good signature -> SIGNED
 * - A signed token whose signature fails -> FORGED (security event, hard reject)
 * - A bare ticket ID (manual entry, legacy printed stock) -> PLAIN, which still
 *   goes through full server-side validation.
 */
export function decodeQrPayload(raw: string): QrDecode {
  const value = raw.trim();
  if (!value) return { kind: "MALFORMED", detail: "Empty scan payload." };

  if (value.startsWith(`${VERSION}.`)) {
    const parts = value.split(".");
    if (parts.length !== 3) {
      return { kind: "MALFORMED", detail: "Signed token is not in the expected three-part form." };
    }
    const [, body, signature] = parts;
    const expected = sign(body);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { kind: "FORGED", detail: "QR signature does not match. Payload was modified or re-encoded." };
    }
    try {
      const payload = JSON.parse(fromB64url(body).toString("utf8")) as QrPayload;
      if (!payload?.t || !payload?.e) {
        return { kind: "MALFORMED", detail: "Signed token is missing ticket or event reference." };
      }
      return { kind: "SIGNED", payload };
    } catch {
      return { kind: "MALFORMED", detail: "Signed token body is not readable JSON." };
    }
  }

  // Bare ticket reference — manual entry or printed stock.
  if (/^ACL-[A-Z-]+-\d{3,}$/i.test(value)) {
    return { kind: "PLAIN", ticketId: value.toUpperCase() };
  }

  if (value.includes("ACLQR")) {
    return { kind: "FORGED", detail: "Payload imitates an ACL token but the version header is wrong." };
  }

  return { kind: "MALFORMED", detail: `"${value.slice(0, 40)}" is not an ACL ticket code.` };
}
