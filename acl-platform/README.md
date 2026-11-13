# Africa Combat League — Digital Platform

The digital home of African combat sports: fighters, fights, events, rankings, champions,
news, video, rivalries, tickets, shop, fan accounts, scouting and an admin CMS.

**Status:** working prototype on demo data. Every fighter, result, sponsor and statistic in
the seed is fictional. Payments and AI run through clearly marked mock services (see
[Integration seams](#integration-seams)).

## Stack

| Layer | Choice |
| --- | --- |
| Web + API | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 with ACL design tokens (`src/app/globals.css`) |
| Database | PostgreSQL via Prisma (`prisma/schema.prisma`, 55 models) |
| Auth | Server-side sessions, scrypt password hashes, role-based permissions |
| Realtime | Server-Sent Events for the live scoreboard (WebSocket/pub-sub ready) |

## Run it

```bash
cp .env.example .env            # set DATABASE_URL to a PostgreSQL database
npm install
npm run db:migrate              # apply migrations
npm run db:seed                 # load the demo world
npm run dev                     # http://localhost:3000
```

Production: `npm run build && npm start`.

### Demo accounts

All use the password `AclDemo!2026` (demo only — the seed refuses to run in production
unless `ALLOW_DEMO_SEED=1`).

| Email | Role | What to try |
| --- | --- | --- |
| `fan@acl.demo` | Fan (premium) | ACL Passport, predictions, tickets, shop, premium video |
| `fighter@acl.demo` | Fighter | Fighter portal (`/portal`) |
| `admin@acl.demo` | Super admin | Everything in `/admin` |
| `editor@acl.demo` | Editor | News, videos, community moderation, notifications |
| `events@acl.demo` | Event manager | Events, fights, tickets, live console |
| `scout@acl.demo` | Scout | Applications pipeline, gyms, fighters |
| `press@acl.demo` | Journalist | Media center downloads |

### Try the live event flow

1. Sign in as `events@acl.demo`, open **Admin → Live console**.
2. Press **Go live**, then **Start** on a bout.
3. In another window open `/events/acl-state-wars-001` — the page is now in LIVE mode.
4. Drive the clock, post commentary, enter round stats and record the result. Predictions
   settle, followers are notified, records and (for title fights) champions update.
5. Press **Back to scheduled** and **Reset** on the bout to restore the demo.

## Quality checks

With the app running on demo data:

```bash
npm run typecheck
node scripts/audit.mjs        # crawls every link as anonymous / fan / admin, desktop + mobile
node scripts/functional.mjs   # 78 functional + security checks (auth, RBAC, CSRF, commerce, live)
```

`functional.mjs` creates a few audit records (a user, orders, a hidden thread). Run
`npm run db:seed` afterwards to return to a clean demo world.

## Integration seams

Nothing external is faked silently. Each seam is an interface with a labelled default:

| Seam | File | Default | To go live |
| --- | --- | --- | --- |
| Payments | `src/server/integrations/payments.ts` | `MockPaymentProvider` — approves instantly, moves no money; the checkout UI says so | Implement `PaymentProvider` for Paystack / Flutterwave / M-Pesa / Stripe; keys via env |
| AI | `src/server/integrations/ai.ts` | Rules engine over league data, labelled "not a language model" | Implement `AiProvider` with an LLM |
| Video | `Video.sourceUrl` | Empty in demo data; the player states that no source is attached | Paste HLS/MP4 URLs from the video CDN |
| Images | `photoUrl`, `coverUrl`, … | Generated ACL artwork when empty | Upload to object storage, paste https URLs |
| Live data | `POST /api/v1/admin/live` | Manual live console | A scoring/stats provider calls the same actions |
| Notifications | `notify()` in `services/engagement.ts` | In-app delivery | Add push / email / WhatsApp channels in that one function |
| Rate limiting | `src/server/rate-limit.ts` | In-memory, single node | Swap the store for Redis |
| Search | `services/search.ts` | Postgres `ILIKE` | Swap for Meilisearch / Typesense / pgvector |
| Geo analytics | `analytics/collect` | Reads CDN country header | Deploy behind a CDN that sets it |

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — product architecture, sitemap, data model,
  components, API, admin, design system, security and performance.
- [`docs/API.md`](docs/API.md) — REST API reference.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — what is built per phase and what comes next.
