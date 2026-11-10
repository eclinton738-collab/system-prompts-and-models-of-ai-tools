# ACL EVENT OS

Event operations command center for **ACL — Africa Combat League**.
Primary event: **Lion’s Den: The First Roar** · Indoor Arena, Aba, Abia State · 26 September 2026 · 500 capacity.

Ticket sales, payments, attendees, QR gate security, seating and tables, agents/POS, marketing, reports and event settings in one application.

## Run it

```bash
cd acl-event-os
npm install
npm run dev            # http://localhost:3000
```

Production build: `npm run build && npm start`.
End-to-end flow tests (server must be running): `npm run test:flows` — 52 checks covering purchase, valid entry, duplicate entry, unpaid, refunded, wrong event, forged QR, manual lookup, role permissions, seating, and a 25-device concurrent scan.

Requires Node 18.18+. No database or external service is needed for demo mode.

## Demo mode — what is real and what is not

| Area | Status |
| --- | --- |
| UI, validation, permissions, check-in rules, seating, reports, CSV export | Real, fully working |
| Data | In-memory store on the server, seeded deterministically. **Resets when the server restarts.** Needs one long-lived Node process (not serverless) |
| Clock | Pinned to fight night (26 Sep 2026, 7:42 PM WAT) and then runs in real time, so the event shows as LIVE. Set `ACL_CLOCK=real` to use the system clock |
| Payments | `DemoPaymentProvider` — **no money moves**. Card/POS/cash settle instantly, bank transfer and USSD stay pending until Finance confirms |
| E-ticket delivery, broadcasts | Logged to the Outbox, **not sent** |
| Sign-in | A role switcher (profile menu) backed by a cookie. **Not real authentication** |
| Camera scanning | Real (`qr-scanner`). Browsers only allow the camera on `https://` or `localhost` |

The Check-In page includes a **Gate Rehearsal Kit**: one ticket per scenario (valid, used, unpaid, refunded, suspended, other event, forged, fake) that can be fired through the real validation API or displayed as a QR to scan with a phone.

### Figures vs. the brief

Every number on screen is derived from records in `src/lib/metrics.ts`. Two figures in the brief could not all be true at once, so the seed follows the headline numbers:

- **327 tickets / ₦8,730,000** — the example split (214/72/28/8/5/3) sums to 330 tickets and ₦8.89M. The seed uses **213 / 72 / 27 / 7 / 5 / 3**, which gives exactly 327 and ₦8,730,000.
- **Attendees remaining** — shown as **141 (43%)**: sold minus checked in. The brief's "314" is capacity minus checked in, which is 63%, not 43%.

## Security model

```
Scanner / browser ──► POST /api/rpc/checkin.scan ──► validate ──► atomic consume ──► audit log
                       (Zod + role check)            (ticket record only)
```

- **The server is the only source of truth.** The QR carries `ACL1.<eventId>.<ticketId>.<HMAC>`. The signature proves ACL issued the code; whether it admits is decided from the ticket and payment records. Type, price and paid-status are never read from the QR.
- **One ticket, one entry.** `src/server/checkin.ts` checks and consumes the ticket in a single uninterrupted step. Twenty-five simultaneous scans of one ticket yield exactly one ACCESS GRANTED (tested).
- **Specific rejections.** Does not exist, tampered, unsigned, wrong event, expired, payment pending, payment failed, refunded, cancelled, suspended, duplicate (with first-scan time/gate/operator/device), wrong gate.
- **Everything is logged.** Every attempt writes a `CheckIn` row (ticket, time, result, reason, gate, operator, device); every rejection writes a `SecurityEvent`; critical ones raise a notification, as does a burst of rejections from one device.
- **Ticket IDs are issued by the server** from a per-type sequence. Agents cannot supply or choose IDs, and an agent's sales are always attributed to their own agent ID.
- **Role-based access** is enforced on the server per action (`src/server/actions.ts`); the UI only hides what a role cannot use.

Set `QR_SIGNING_SECRET` to a long random value before issuing real tickets. Changing it invalidates every QR already issued.

## Architecture

```
src/
  lib/            types, Zod schemas, permissions, formatting, metrics (all derived figures)
  server/         store + seed, QR signing, check-in, actions, payment provider, session
  app/api/        GET /api/state (read model) · POST /api/rpc/<action> · POST /api/session
  app/*           one route per section
  components/     ui.tsx (design system), shell/, features/, charts.tsx, ops-provider.tsx
prisma/schema.prisma   PostgreSQL model (validated), mirrors src/lib/types.ts
scripts/test-flows.mjs end-to-end checks
```

The browser never mutates state. It holds a snapshot from `/api/state` (re-fetched when the server's version changes) and sends every change through `call(action, input)` in `components/ops-provider.tsx`.

## Going to production

1. **Database** — `prisma/schema.prisma` is ready for PostgreSQL. Replace `src/server/store.ts` with Prisma queries; each handler in `src/server/actions.ts` becomes one `prisma.$transaction`.
2. **Atomic check-in** — inside a transaction, consume the ticket with a conditional update and treat "0 rows" as a duplicate:
   ```sql
   UPDATE "Ticket" SET status = 'USED', "checkedInAt" = now(), "admissionId" = $2
    WHERE id = $1 AND status = 'ACTIVE'
   RETURNING id;
   ```
   `Ticket.admissionId` is `UNIQUE`, so the database itself refuses a second admission. Do the same for inventory (`Seat.ticketId` is `UNIQUE`) and ticket serials (`TicketType.nextSerial`, incremented in the purchase transaction).
3. **Payments** — implement `PaymentProvider` in `src/server/payments.ts` for your gateway (Paystack, Flutterwave, Monnify…) and confirm payments from signed webhooks rather than the client.
4. **Authentication** — replace `currentUser()` in `src/server/session.ts` with a real session. All authorisation already keys off the returned user's role.
5. **Messaging** — send e-tickets/broadcasts from the `tickets.send` and `marketing.broadcast` actions via your email/SMS/WhatsApp provider.
6. **Hardening** — rate-limit `/api/rpc/checkin.scan` per device, serve over HTTPS, and replace polling with server-sent events if gate volume demands it.

## Design notes

- Brand imagery is drawn in CSS/SVG (arena lighting, cage mesh, ACL mark) so the repo ships no third-party photos. Drop real fight photography into the `.arena` backdrop in `src/app/globals.css` when available.
- Chart colours are a validated colour-blind-safe palette (`src/lib/theme.ts`); green/amber/red are reserved for status.
