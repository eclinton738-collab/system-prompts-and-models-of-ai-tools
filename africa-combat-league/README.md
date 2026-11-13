# Africa Combat League (ACL)

**Unchained. Unbreakable.** Built by fighters for fighters.

The official website and web app for Africa Combat League, the combat sports promotion based in Aba, Abia State, Nigeria. Founded by Clinton Edward.

This is **step 1: the scaffold**. Feature pages come next. Every route in the sitemap exists and shows "Coming soon" until its page is built.

## What is in the scaffold

| Area | Where | Notes |
| --- | --- | --- |
| Design tokens | `src/styles/tokens.css` | The one file for colour, type, spacing, radius, motion. Replace values here when the brand bible lands. |
| Layout | `src/components/layout/` | Responsive header, sticky mobile bottom nav (Events, Watch, Fighters, Lion's Den, Menu), footer with the founder line and legal links. |
| Sitemap | `src/config/sitemap.ts` | One tree drives header, footer, mobile menu, "Coming soon" pages and `sitemap.xml`. |
| Coming soon | `src/app/(site)/[...slug]/page.tsx` | Add a real page at the same path and Next.js uses it instead. |
| Database | `supabase/migrations/` | 34 tables, row-level security on every one, audit triggers, core seed. |
| Auth | `src/app/(site)/auth/` | Email code or magic link, phone OTP, Google. Server actions only. |
| Roles | `src/lib/auth/`, `roles` + `user_roles` tables | Super Admin, Promotions, Talent, Media, Academies, Fighter, Member, Sponsor, Fan. |
| Admin shell | `src/app/admin/` | Role-filtered sections. Settings editor, Users and roles, Audit log are live. The rest say "Coming soon". |
| PWA | `src/app/manifest.ts`, `public/sw.js` | Installable, offline fallback page, ticket pages kept in their own cache. |
| Data saver | `src/lib/data-saver.ts` | Toggle in footer and mobile menu. Low-res images, no autoplay. Turns on by itself when the phone asks to save data. |
| Settings | `settings` table, `/admin/settings` | Brand facts live in the database, never in code. |
| i18n | `src/i18n/` | English live. French, Pidgin, Hausa, Igbo, Yoruba, Swahili wired in, switched off. |
| Currency | `src/lib/currency.ts` | NGN default. USD, GHS, KES, ZAR ready. Money stored as integer minor units. |
| SEO | `src/app/sitemap.ts`, `robots.ts`, `opengraph-image.tsx` | Server-rendered pages, Organization JSON-LD, default share card with the founder photo slot. |

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, Storage).

Planned integrations, with environment variables already reserved: Paystack (Flutterwave fallback), Mux or Cloudflare Stream, Termii or Africa's Talking, Resend, PostHog or GA4, Meta Pixel, TikTok Pixel, Cloudflare Turnstile.

## Run it

```bash
cd africa-combat-league
npm install
cp .env.example .env.local   # fill in the Supabase keys
npm run dev                  # http://localhost:3000
```

The site runs without Supabase keys. Public pages then use `src/config/settings-fallback.json`, and sign-in shows a "not connected" notice.

Other commands: `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`.

## Set up Supabase

1. Create a Supabase project. Copy the URL, anon key and service role key into `.env.local`.
2. Apply the migrations: `npx supabase link --project-ref <ref>` then `npx supabase db push`. Or paste the files in `supabase/migrations/` into the SQL editor, in order.
3. Auth → Providers:
   - **Email**: on. Set the OTP length to 6. Add `{{ .Token }}` to the Magic Link email template so the email carries both the code and the link.
   - **Phone**: on. Connect an SMS provider. Supabase supports Twilio, MessageBird, Vonage and Textlocal directly. For Termii or Africa's Talking use the **Send SMS hook** (Auth → Hooks) pointing at a small function that calls their API.
   - **Google**: on. Add the OAuth client ID and secret from Google Cloud.
4. Auth → URL configuration: set Site URL to your domain and add `https://<domain>/auth/callback` (and `http://localhost:3000/auth/callback`) to Redirect URLs.
5. Auth → Multi-factor: enable TOTP. Admin access requires it.
6. Auth → Attack protection: enable CAPTCHA with Cloudflare Turnstile and paste the Turnstile secret. Put the site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
7. Auth → Rate limits: keep the defaults or tighten them. They cover the sign-in forms.

### Make the founder Super Admin

Sign in once on the site, then run this in the Supabase SQL editor:

```sql
insert into public.user_roles (user_id, role_key)
select id, 'super_admin' from public.profiles where email = 'founder@example.com';
```

Then open `/admin`. The first visit asks you to set up two-factor with an authenticator app. After that, grant every other role from **Admin → Users and roles**.

## Environment variables

All secrets live in environment variables. `.env.example` lists every one.

| Variable | Used | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | now | Canonical URL. Use `https://africacombatleague.com` in production. |
| `NEXT_PUBLIC_SUPABASE_URL` | now | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | now | Public key. Safe in the browser. Row-level security applies. |
| `SUPABASE_SERVICE_ROLE_KEY` | now (server only) | Bypasses row-level security. For webhooks and verified form inserts. Never expose it. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | now | Turnstile widget on sign-in. |
| `TURNSTILE_SECRET_KEY` | now | Server-side Turnstile check for public forms. |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY` | later | Payments. The secret key also verifies webhook signatures. |
| `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_HASH` | later | Fallback payments. |
| `TICKET_QR_SIGNING_SECRET` | later | Signs offline-verifiable ticket QR codes. |
| `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_PRIVATE_KEY` | later | Video (option A). |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN` | later | Video (option B). |
| `TERMII_API_KEY`, `TERMII_SENDER_ID` | later | SMS (option A). |
| `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY` | later | SMS (option B). |
| `RESEND_API_KEY`, `EMAIL_FROM` | later | Transactional email. |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_GA4_ID` | later | Analytics. Load only after consent. |
| `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | later | Ad pixels. Load only after consent. |

## Roles and access

| Role | Covers |
| --- | --- |
| `super_admin` | Founder. Everything, plus settings, roles and the audit log. |
| `promotions` | Events, series, bouts, ticket types, ticket scanning, sponsor applications. |
| `talent` | Fighters, rankings, sports, weight classes, fighter and tryout applications. |
| `media` | News, video, shop products, leaderboards. |
| `academies` | Lion's Den, membership plans, memberships, class schedule, franchise applications. |
| `fighter`, `member`, `sponsor`, `fan` | Account roles. Every new account starts as `fan`. |

Access is checked three times:

1. `src/proxy.ts` sends signed-out visitors away from `/admin` and `/account`.
2. `requireAdmin()` in `src/lib/auth/session.ts` checks role and two-factor on every admin page and server action.
3. Row-level security in Postgres checks again. `is_admin('<department>')` needs the role (or `super_admin`) **and** a two-factor session. This is the one that cannot be bypassed.

**Audit log.** A database trigger writes a row to `audit_log` for every insert, update and delete a staff member makes on an admin-managed table. Nobody can write to or edit the log from the app. Use `select public.log_admin_action('verb', '{}'::jsonb)` for actions that are not row changes.

## Data model

Migrations, in order:

1. `core_identity`: `countries`, `states`, `profiles`, `roles`, `user_roles`, `settings`, `audit_log`, helper functions.
2. `sport_and_content`: `sports`, `weight_classes`, `series`, `fighters`, `events`, `bouts`, `rankings`, `articles`, `videos`.
3. `commerce`: `ticket_types`, `orders`, `order_items`, `tickets`, `payment_events`, `products`, `variants`, `carts`, `cart_items`, `membership_plans`, `memberships`, `class_schedule`.
4. `engagement`: `applications`, `predictions`, `leaderboards`, `notifications`, `subscriptions`, `data_requests`.
5. `rls`: enables row-level security on every table, policies, grants, audit triggers.
6. `storage`: `media` (public) and `private` (signed URLs) buckets.
7. `seed_core`: reference data and the real records.

Rules the schema enforces:

- **Sports are data.** Boxing is active. MMA, kickboxing, Dambe and Laamb are rows with `is_active = false`. Switching one on is an update, not a migration.
- **Never trust the client.** Clients cannot write `orders`, `order_items`, `tickets` or `payment_events`. Only the server writes them, after a signed webhook is verified. `payment_events` has a unique `(provider, provider_event_id)` so webhook handling is idempotent.
- **Fighter consent.** A fighter is public only when `rights_consent` is true and status is not `draft`.
- **18+.** `predictions` can only be written by accounts with a date of birth 18 or more years ago. Date of birth cannot be changed once set. Predictions are points only. There is no real-money wagering.
- **Privacy.** `profiles` are readable only by their owner and staff. `data_requests` holds NDPA access, correction and deletion requests.
- **Public forms** (`applications`, `data_requests`) have no public insert policy. The server verifies Turnstile with `verifyTurnstile()` and inserts with the service role.

### Seed content

Only real records are seeded:

- **ACL 001**, "Rise of the Lion: The Reckoning", Item, Abia State. Status `completed`. Attendance about 10,000. The exact date and venue are left empty for the team to fill in.
- **State Wars: Imo vs Abia**, Governors' Cup. Status `postponed`. Date TBA.
- **Lion's Den Fight Night**. A series with no events.

Plus reference data: 36 Nigerian states and the FCT, 12 countries, 5 sports, 17 boxing weight classes, 9 roles, and the settings.

Any demo content added later must set `is_sample = true` and show the "Sample" label on screen.

## Settings

Edit at `/admin/settings`. Values are JSON, so text goes in double quotes. Pages refresh within seconds of saving.

Seeded keys: `brand.*` (name, tagline, philosophy, story), `founder.*` (name, title, footer line, photo URL), `hq.*`, `contact.phone`, `contact.whatsapp`, `contact.email`, `site.domain`, `facts.acl_001`, `social.links`, `currency.*`, `i18n.*`, `compliance.min_age`.

`src/config/settings-fallback.json` mirrors the seed. It is used only when the database cannot be reached, so the site never renders blank. The database always wins.

## Brand rules for anyone writing code or copy

- Write "Africa Combat League". Never "African".
- Write "Lion's Den". Never "Lion's Den Gym".
- Voice: African, prideful, dominant, raw. Short sentences. Never apologetic.
- "Founded by Clinton Edward" is in the footer of every page. Keep it there.
- The bamboo-stick ring is the origin symbol. The `.bamboo-rule` motif carries it. Use it. Never hide it.
- Gold (`--color-gold`) is for champions, title bouts and the founder line only.
- The logo and app icons are placeholders until the brand bible arrives. Nothing here copies another promotion's identity.

## Adding a page

1. Create `src/app/(site)/<path>/page.tsx`. It replaces the "Coming soon" page for that path.
2. Put every visible string in `src/i18n/messages/en.json`.
3. Read facts from `getSettings()`, never from constants.
4. Use `<AclImage>` for images so Data saver works.
5. Remove the `noindex` by giving the page its own `metadata`.

## Not in this step

These are planned and have tables or environment variables waiting, but no code yet:

- Feature pages: events, tickets, watch, fighters, rankings, shop, Play, Lion's Den and the rest.
- Payments and webhooks, ticket QR issuing and scanning, video playback.
- Cookie consent banner and analytics. No analytics or pixels load today, so nothing needs consent yet. The banner must ship with the first tracker.
- The 18+ age gate screen. The database rule is already in place.
- App-level rate limiting for ACL's own public forms. Sign-in is covered by Supabase's limits and Turnstile.
- Generated TypeScript types for the database: run `npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts`.

## Tested so far

- Migrations apply cleanly to Postgres 16. Row-level security was checked for anonymous, fan, admin without two-factor, and admin with two-factor.
- `npm run build`, `npm run lint` and `npm run typecheck` pass.
- Public pages, navigation, the mobile menu and the Data saver toggle were checked in a browser at phone and desktop sizes.
- **Not yet tested against a live Supabase project:** sign-in (email, phone, Google), two-factor enrolment, and the admin pages. Test these after connecting a project.
