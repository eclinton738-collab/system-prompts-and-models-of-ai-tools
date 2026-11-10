import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * QR payload format:  ACL1.<eventId>.<ticketId>.<signature>
 *
 * The signature is an HMAC-SHA256 over "ACL1.<eventId>.<ticketId>", truncated to
 * 128 bits and base64url encoded. A payload that does not verify was not issued
 * by this server. The signature proves origin only — validity (paid, unused,
 * right event) is always decided from the ticket record, never from the payload.
 */
const VERSION = "ACL1";
const secret = () => process.env.QR_SIGNING_SECRET || "acl-demo-signing-secret-do-not-use-in-production";

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest().subarray(0, 16).toString("base64url");
}

export function issueQrToken(eventId: string, ticketId: string) {
  const body = `${VERSION}.${eventId}.${ticketId}`;
  return `${body}.${sign(body)}`;
}

export type ParsedPayload =
  | { kind: "signed"; eventId: string; ticketId: string }
  | { kind: "tampered"; claimedTicketId: string }
  | { kind: "raw"; ticketId: string }
  | { kind: "malformed" };

const RAW_ID = /^ACL-[A-Z]{2,4}(-[A-Z]{2})?-\d{3,6}$/;

export function parsePayload(input: string): ParsedPayload {
  const text = input.trim();
  if (!text || text.length > 200) return { kind: "malformed" };
  if (text.startsWith(`${VERSION}.`)) {
    const parts = text.split(".");
    if (parts.length !== 4) return { kind: "tampered", claimedTicketId: parts[2] ?? "" };
    const [v, eventId, ticketId, sig] = parts;
    const expected = Buffer.from(sign(`${v}.${eventId}.${ticketId}`));
    const got = Buffer.from(sig);
    const ok = expected.length === got.length && timingSafeEqual(expected, got);
    return ok ? { kind: "signed", eventId, ticketId } : { kind: "tampered", claimedTicketId: ticketId };
  }
  const upper = text.toUpperCase();
  if (RAW_ID.test(upper)) return { kind: "raw", ticketId: upper };
  return { kind: "malformed" };
}
