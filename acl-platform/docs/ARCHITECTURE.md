# ACL Platform Architecture

## 1. Product architecture

One Next.js application serves the public site, the fan account area, the fighter portal,
the admin CMS and a versioned REST API. All of them sit on one service layer and one
PostgreSQL database, so the website is simply the first client of the API.

```
Browser / mobile app / smart TV / partners
            │
   ┌────────┴─────────┐
   │  Pages (RSC)     │  /api/v1/*  REST  ── SSE /live/{event}/stream
   └────────┬─────────┘        │
            └──── src/server/services ────┘   domain logic (records, rankings, commerce,
                        │                     engagement, live, search, analytics)
            src/server/integrations           payments · AI  (swappable providers)
                        │
                   PostgreSQL (Prisma)
```

Principles applied throughout:

- **Data-driven, never hard-coded.** Records, champions, title defences, country rankings,
  head-to-head tallies, "trending" and audience numbers are computed from rows.
- **No duplicated facts.** A fighter's record is *pre-ACL record + completed ACL fights*,
  derived on read. Enter a result once and every page, card and API response changes.
- **Honest seams.** Anything not integrated is an interface with a labelled mock.
- **Africa-first.** Local-currency pricing with display conversion, WhatsApp-first sharing,
  server-rendered pages with ~105 kB of JS, no map tiles, no third-party trackers, state /
  city / nation rivalries as first-class data.

## 2. Sitemap

```
/                               Home (hero event, countdown, fights, champions, results, …)
/fights                         Fight Center: upcoming · live · completed
/fights/{slug}                  Tale of the tape, head-to-head, stats, scorecards, predictions
/fighters                       Searchable, filterable fighter database
/fighters/{slug}                Profile: overview · record · history · statistics · ranking ·
                                titles · videos · photos · news · social · biography
/rankings                       Champion + top 10 per division, movement, next fight
/rankings/countries             Computed national rankings
/champions                      Championship hub
/champions/{division}           Road to the title, title history, championship fights
/events                         Calendar: upcoming/past, filter by country, city, month, type
/events/{slug}                  Event page; becomes a live scoreboard when the event is LIVE
/events/{slug}/tickets          Ticket selection and checkout
/tickets                        All events on sale
/news  /news/{slug}  /news/category/{c}  /authors/{handle}
/watch /watch/{slug} /watch/category/{c} /originals
/rivalries /rivalries/{slug}    Rivalry engine: timeline, quotes, encounters, fan vote
/state-wars                     Regional rivalry series
/map  /map/{country}            Africa Combat Map
/gyms /gyms/{slug}              Gym directory
/shop /shop/{slug} /cart        Merchandise
/community /community/{id}      Threads, fighter Q&A, polls, fan clubs (moderated)
/predictions /leaderboard       Fan predictions and fan-rank leaderboards
/search                         Global search + "what should I watch?"
/join /sign-in
/account                        ACL Passport · orders & digital tickets · predictions ·
                                alert preferences · settings
/notifications
/apply /portal                  Scouting application and fighter/applicant dashboard
/media /partners                Media center, sponsor portal
/about /contact /careers /privacy /terms /cookies
/admin/…                        CMS (section 7)
/sitemap.xml /robots.txt /manifest.webmanifest
/api/og/{type}/{slug}           Share-card generator
```

Mobile adds a fixed bottom bar (Home · Fights · Fighters · Watch · My ACL) and a full-screen
menu. **Get tickets** is always in the header.

## 3. Data model

`prisma/schema.prisma` — 55 models. Core relationships:

```
Country ─< Fighter >─ Division ─< Ranking >─ Fighter
                │          └─< TitleReign >─ Fighter      (open reign = champion)
   Gym ─< Coach ┘
Event ─< Fight >─ FighterA / FighterB / Winner
   │       ├─< FightRoundStat   (round-by-round punch stats per fighter)
   │       ├─< Scorecard        (per judge)
   │       ├─< Commentary       (live feed)
   │       └─< Prediction >─ User
   ├─< Event (programme: weigh-in, presser, workout, fan event)
   ├─< TicketType ─< Ticket >─ Order >─ User
   └─>< Sponsor
Article >─ User (author) ; Article >─< Tag ; Article >─< Fighter
Video >─ Series ; Video >─< Fighter ; Video >─ Event / Fight
Rivalry (FIGHTER | REGION) ─< RivalryMoment ; ─< RivalryVote
Product ─< OrderItem >─ Order ; PromoCode
User ─< Follow, EventFavorite, WatchlistItem, VideoView, PointEntry, UserBadge,
        Notification ; ─ NotificationPreference ; ─< Session
Application ─< ApplicationMessage
Thread ─< Post ; Report ; Poll ─< PollOption ─< PollVote
AnalyticsEvent · AuditLog · SiteSetting · Currency · NewsletterSubscriber ·
SponsorInquiry · ContactMessage · MediaAsset · Photo
```

Design decisions:

- Money is `priceMinor` (integer) + ISO `currency`; `Currency.perUsd` drives display conversion.
- Countries are ISO-3166 rows; the numeric code joins to map geometry.
- `PointEntry` has a unique `(user, reason, refKey)` so fan points are idempotent.
- Live state lives on `Fight` (`currentRound`, `clockSeconds`, `clockRunning`,
  `clockUpdatedAt`), so any client can compute the running clock from one snapshot.
- `FightRoundStat.source` records where numbers came from (`manual`, a provider id, `demo`).

## 4. Code layout

```
prisma/                 schema, migrations, seed (demo world)
src/app/(site)/         public site, account, portal
src/app/admin/          CMS screens
src/app/api/v1/         REST API (one folder per resource)
src/app/api/og/         share-card generator
src/server/
  auth.ts permissions.ts api.ts rate-limit.ts audit.ts serializers.ts
  services/             fighters, fights, events, rankings, engagement, commerce,
                        live, search, analytics, map, money
  integrations/         payments.ts, ai.ts
  admin/                resources.ts (CMS registry), engine.ts, form.ts, nav.ts
src/components/         server components: ui, cards, fight, media, AfricaMap, SiteShell
src/components/client/  interactive islands: ApiForm, SiteChrome, Countdown, Engage,
                        LiveBoard, LiveConsole, Commerce, ShareButtons, Beacon
src/lib/                format, site config, content enums
scripts/                audit.mjs, functional.mjs
```

## 5. Component architecture / design system

Tokens (`globals.css`): ink `#08080A`, coal, steel, line, bone `#F6F4EF`, red `#E3182D`,
gold `#D6AB3B`; display face Big Shoulders Display (self-hosted, one woff2), system UI for body.

| Group | Components |
| --- | --- |
| Primitives | `.btn` (red / gold / white / ghost, sm / lg), `.card`, `.chip`, `.field`, `.label`, `.table-acl`, `.rail`, `.eyebrow` |
| Layout | `PageHeader`, `SectionHeader`, `Breadcrumbs`, `Tabs` (link-driven, no JS), `FilterBar` (GET form) |
| Data display | `Stat`, `BarList`, `Movement`, `LiveBadge`, `EmptyState`, `Flag`, `JsonLd` |
| Sport | `FighterCardView`, `FightRow`, `FaceOff`, `TaleOfTape`, `CompareBar`, `Form`, `EventCardView`, `DateBlock`, `RankChip`, `BeltIcon`, `AfricaMap` |
| Content / commerce | `ArticleCard`, `VideoCard`, `ProductCard`, `GymCard`, `RivalryGrid` |
| Artwork | `FighterPortrait`, `Artwork`, `Logo` — uploaded asset when a URL exists, generated brand art otherwise |
| Interactive | `ApiForm` (config-driven form used by site and CMS), `Countdown`, `PredictionWidget`, `VoteBar`, `ToggleButton`, `ActionButton`, `ShareButtons`, `LiveBoard`, `LiveConsole`, `AddToCart`, `CartView`, `TicketPicker`, `SiteHeader` (menu, search overlay, bottom nav), `CurrencySelect` |

Pages are server components; only the islands above ship JavaScript.

## 6. API architecture

REST under `/api/v1`, JSON envelope `{ "data": … }` or
`{ "error": { "code", "message", "fields?" } }`. Every route is wrapped by `route()` in
`src/server/api.ts`, which applies, in order: rate limit → same-origin check on mutations →
session → permission → Zod body validation → uniform error mapping. See [`API.md`](API.md).

Realtime: `GET /api/v1/live/{eventId}/stream` (SSE) pushes a flat snapshot whenever it
changes; `GET /api/v1/live/{eventId}` is the polling fallback. All live writes go through
`POST /api/v1/admin/live`, the seam for an automated scoring provider.

## 7. Admin architecture

The CMS is generated from a registry (`src/server/admin/resources.ts`): 26 resources, each
declaring fields, list columns, permission, validation and save hooks. The generic list /
create / edit screens and `/api/v1/admin/{resource}` are driven by it, so a new content type
is configuration, not new screens.

Sidebar: Dashboard · Live console · Fighters · Fights · Events · Rankings (Divisions) ·
Champions · News (Tags) · Videos (Originals series) · Photos (Media assets) · Rivalries
(Timeline) · Tickets · Shop (Promo codes) · Users (Contact messages) · Applications ·
Sponsors (Inquiries) · Gyms (Coaches) · Community (Polls) · Notifications · Analytics ·
Settings (Currencies, Countries, Audit log).

Save hooks carry the business rules: booking a fight notifies both fighters' followers;
recording a result settles predictions, notifies followers and transfers the title when a
belt changes hands; a ranking change, ticket release, breaking story or new video alerts
the right fans.

Purpose-built screens: **Live console**, **Scouting pipeline** (Application → Review →
Scouting → Test → Contract → ACL Fighter), **Notifications** broadcast, **Executive
analytics**, **Community moderation**, **Audit log**.

### Roles

`SUPER_ADMIN, ADMIN, EVENT_MANAGER, EDITOR, SCOUT, JOURNALIST, MEDIA_PARTNER, SPONSOR, COACH,
FIGHTER, FAN` map to 19 permissions in `src/server/permissions.ts`. Public sign-up always
creates a `FAN`; only a super admin can create, change or reset admin accounts.

## 8. Security

| Concern | Implementation |
| --- | --- |
| Passwords | scrypt with per-user salt, constant-time compare, minimum 10 characters |
| Sessions | 256-bit random token; only its SHA-256 is stored; HttpOnly, SameSite=Lax, Secure in production; revoked on password / role change |
| Brute force | Per-client and per-account login throttles; timing-equalised unknown-email path |
| CSRF | SameSite cookies plus Origin check on every mutating API request |
| XSS | React escaping everywhere; no user HTML is rendered; URL fields restricted to http(s) |
| SQL injection | Prisma parameterised queries only |
| Access control | Permission check in every admin page and API route; orders, tickets and applications are scoped to the owner |
| Validation | Zod schemas on every body; field-level errors returned to forms |
| Rate limiting | Every route (240/min reads, 30/min writes, tighter on auth and forms) |
| Uploads | No binary upload endpoint: assets are referenced by https URL from object storage |
| Headers | `X-Frame-Options: DENY`, `nosniff`, HSTS, Referrer-Policy, Permissions-Policy |
| Audit | Sign-ins, failed sign-ins, CMS writes, live commands, orders, broadcasts |
| Secrets | Only `DATABASE_URL` in `.env` (git-ignored); no keys in the repository |

Before launch: add a Content-Security-Policy, move rate limiting to a shared store, add
email verification and password reset, and commission an external penetration test.

## 9. Performance

- Server-rendered pages; ~105 kB shared JS, most pages add under 3 kB.
- No web-font requests to third parties (one self-hosted woff2, `font-display: swap`).
- Africa map is server-rendered SVG — no tiles, no map library in the browser.
- Generated artwork is inline SVG/CSS, so demo pages make almost no image requests;
  real images are lazy-loaded.
- Horizontal rails instead of large grids on small screens; 44 px touch targets.
- Share cards are cached at the CDN (`s-maxage`, `stale-while-revalidate`).
- `prefers-reduced-motion` respected.

Next steps for scale: cache public reads at the CDN (pages are currently rendered per
request because the header is personalised — move the viewer state to a small client
fetch to make them cacheable), add `next/image` with a loader for the chosen image CDN,
and index hot columns as data grows.

## 10. SEO

Per-page titles, descriptions and canonical URLs; Open Graph and X cards with generated
images; JSON-LD (`SportsOrganization`, `WebSite` + `SearchAction`, `Person`, `SportsEvent`,
`NewsArticle`, `VideoObject`, `Product`, `SportsActivityLocation`); dynamic `sitemap.xml`;
`robots.txt` excluding private areas; clean slugs; real HTTP 404s.
