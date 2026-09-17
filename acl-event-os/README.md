# ACL EVENT OS

**ACL — AFRICA COMBAT LEAGUE**
_Unchained. Unbreakable. Unbound._

Event operations command centre for ACL live events: ticketing, payments, QR
security, check-in, seating, agents and reporting.

Primary event: **Lion's Den: The First Roar** — 26 September 2026, Indoor Arena,
Aba, Abia State. Capacity 500. All amounts in Nigerian Naira (₦).

---

## Running it

```bash
cd acl-event-os
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build && npm start   # production build
npm test                     # critical-flow tests (73 assertions)
npm run typecheck            # tsc --noEmit
```

No database or API keys are needed. The app boots with a full, realistic demo
dataset held in memory.

---

## Stack

Next.js 15 (App Router) · TypeScript (strict) · React 19 · Tailwind CSS v4 ·
Recharts · lucide-react · Zod · `qrcode` (generation) · `@zxing/browser`
(camera scanning) · Prisma schema for PostgreSQL.

---

## Architecture

```
Browser ──► Next route handler ──► AclStore (data layer) ──► validation ──► atomic check-in
            (/src/app/api/*)       (/src/lib/server)
```

| Path | What lives there |
|---|---|
| `src/lib/domain/` | Types, ticket catalogue, Zod schemas, permissions, pure analytics |
| `src/lib/data/` | Deterministic demo dataset |
| `src/lib/server/` | Data layer, QR signing, API helpers |
| `src/app/api/` | Route handlers — the only way the client reaches data |
| `src/lib/client/` | Fetch client, state provider, e-ticket builder |
| `src/components/` | UI primitives, charts, scanner, shell |
| `prisma/schema.prisma` | PostgreSQL model matching the in-memory store 1:1 |

**Derived, never typed.** Every figure on screen comes from `src/lib/domain/stats.ts`
operating on ticket rows. No total, percentage or revenue number is hardcoded in a
component. The seeded book balances exactly: 327 tickets, 312 paid, ₦8,730,000
settled, 186 checked in, 500 seats allocated — all asserted in `npm test`.

---

## Security model

**The frontend is never the source of truth.** The scanner posts whatever the
camera decoded; the server decides.

1. **Signed QR payloads.** A ticket's QR carries `ACLQR1.<payload>.<hmac>`, not a
   bare ticket ID. A payload edited off-platform fails the signature check before
   the database is touched. The signature only buys a *cheap rejection* — it is
   never treated as proof of validity.
2. **Server-side revalidation.** Every scan re-reads the live ticket row and
   re-checks event binding, payment status, ticket lifecycle and prior use.
3. **Atomic check-in.** Admission runs inside a per-ticket lock and ends in a
   compare-and-set, equivalent to:
   ```sql
   SELECT ... FROM "Ticket" WHERE id = $1 FOR UPDATE;
   UPDATE "Ticket" SET status='USED', "usedAt"=now(), version=version+1
     WHERE id = $1 AND status = 'VALID';   -- 0 rows ⇒ another scanner won
   ```
   Two devices scanning the same ticket simultaneously: exactly one gets ACCESS
   GRANTED. Verified with 3, 8 and 25 concurrent scans, in-process and over HTTP.
4. **Specific refusals.** The gate never shows a bare "invalid". Each rejection
   names its cause — payment pending, payment failed, refunded, wrong event,
   expired, already used, suspended, forged signature, unknown reference — with
   operator guidance.
5. **Duplicate scans** return SECURITY ALERT with the first scan's time, gate and
   operator, and raise a critical security event plus a notification.
6. **Server-minted IDs.** Ticket IDs are generated only by the data layer. Agents
   supply a customer and a tier; they can never choose or reuse an identifier.
7. **Full audit trail.** Every scan — granted or refused — records ticket, time,
   result, reason, gate, operator and device.
8. **Role checks on the API.** Hiding a button is convenience; `requirePermission`
   on each mutating route is the gate.

### Roles

`SUPER_ADMIN` · `EVENT_MANAGER` · `FINANCE` · `CHECK_IN_STAFF` · `TICKET_AGENT` ·
`SECURITY` — 22 capabilities mapped in `src/lib/domain/permissions.ts`. Switch
the acting operator from the profile menu to see navigation and actions change;
the API enforces the same matrix (check-in staff cannot sell, agents cannot
refund, finance cannot operate the gate).

---

## Demo mode → real backend

The in-memory `AclStore` is the demo adapter. Its methods map 1:1 onto Prisma
calls against `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

`checkIn()` is written so the swap changes one function body: replace the
per-ticket promise lock with `SELECT ... FOR UPDATE` inside `$transaction`, and
the compare-and-set with the conditional `UPDATE`. Everything above the data
layer is untouched.

**Payments** are integration points, not a fake gateway. `Payment` carries
`method`, `status`, `reference` and `providerRef`; card, transfer, USSD, POS and
cash outlets each settle through the same record shape, so a real provider
adapter slots in without changing the ledger or the UI. No payment integration is
simulated as if it were live.

**QR signing** reads `ACL_QR_SECRET` from the environment (falling back to a demo
key). In production this is a KMS-held key shared with the ticket-issuing service.

---

## Screens

Dashboard · Ticketing · Sales & Revenue · Check-In (+ Check-In Log) · Attendees ·
Seating & Tables · Payments · Agents / POS · Marketing · Reports · Security ·
Event Settings.

- **Scanner** — three modes: camera scan, manual entry, full-screen camera. Falls
  back cleanly with a clear message when no camera is available.
- **Reports** — seven reports, CSV export and a print-ready view.
- **Responsive** — full dashboard on desktop, condensed on tablet, collapsible
  sidebar plus bottom navigation on mobile, with the scanner tuned for phones.

---

## Notes on the data

Two figures in the original brief contradict each other, so the dataset resolves
them in favour of the headline numbers:

- The example tier split (214/72/28/8/5/3) sums to **330**, while the stated total
  is **327** and settled revenue is **₦8,730,000**. The seed reproduces the total,
  the payment split (312 paid / 8 pending / 5 failed / 2 refunded) and the revenue
  exactly; the tier mix lands at 208/76/27/8/5/3 — the closest split that makes
  those figures true.
- "Attendees remaining" is shown as **141** (tickets sold minus checked in, 43%),
  which is the operationally meaningful number and matches the 57% / 43% split.

Week-on-week movement (+12% tickets, +18% revenue) is computed from purchase
timestamps, not asserted — the seed schedules sales into week buckets so the
derived figures land on those values.

---

**FIGHTERS. STORIES. AFRICA. THE WORLD.**
**BUILT BY FIGHTERS FOR FIGHTERS.**
