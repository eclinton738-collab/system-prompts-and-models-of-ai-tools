# REST API (`/api/v1`)

Responses: `{ "data": … }` on success, `{ "error": { "code", "message", "fields"? } }` on
failure. Authentication is the `acl_session` cookie. Mutating requests must be same-origin.
Lists accept `?limit=` (max 50) and `?page=` where noted.

## Public (no auth)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/fighters` | `q, country, division, gender, status, gym, style, sort, champion, undefeated` |
| GET | `/fighters/{slug}` | Profile, derived record, titles, fights |
| GET | `/fights` | `status=scheduled\|live\|completed` |
| GET | `/fights/{slug}` | Scorecards, statistics (totals + per round), fan prediction split |
| GET | `/events` | `when=upcoming\|past, country, city, month=YYYY-MM, type` |
| GET | `/events/{slug}` | Card, tickets with remaining counts, programme, sponsors |
| GET | `/rankings` | `division=`; `scope=countries` for national rankings |
| GET | `/champions` | Champion, reign start, defences, next defence per division |
| GET | `/news` | `category`, paged |
| GET | `/videos` | `category`, paged (stream URLs are never listed) |
| GET | `/gyms` | `country, city, discipline` |
| GET | `/search?q=` | Categorised results; `quick=1` for the overlay |
| GET | `/ai/recommend?q=` | Style/country recommendations (rules engine) |
| GET | `/live/{eventId}` | Live snapshot |
| GET | `/live/{eventId}/stream` | Server-Sent Events, one snapshot per change |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | |
| POST | `/contact`, `/sponsor-inquiries`, `/newsletter` | |
| POST | `/analytics/collect`, `/engage/share`, `/engage/consume`, `/preferences/currency` | |

## Signed-in

| Method | Path | Notes |
| --- | --- | --- |
| GET / PATCH | `/me` | Profile + ACL Passport |
| POST | `/me/password` | Revokes other sessions |
| GET / POST | `/follows` | `{ fighterId, on }` |
| POST | `/follows/notify`, `/events/favorite`, `/watchlist` | Toggles |
| POST | `/predictions` | `{ fightId, pickFighterId, method?, round? }` — free fan game |
| POST | `/polls/{id}/vote`, `/rivalries/{id}/vote` | `{ choice }` |
| POST | `/community/threads`, `/community/posts`, `/community/report` | |
| GET | `/notifications` · POST `/notifications/read` · GET/PUT `/notifications/preferences` | |
| POST | `/orders/tickets` | `{ eventId, items[], holderName?, promoCode? }` |
| POST | `/orders/shop` | `{ items[], shipping…, promoCode? }` |
| POST | `/applications`, `/applications/message` | Scouting |

## Permissioned

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/media/assets/{logo\|media-kit\|fighter-bios\|results\|fight-card}` | `media.download` |
| POST | `/community/moderate` | `community.moderate` |
| POST | `/admin/{resource}` · PATCH/DELETE `/admin/{resource}/{id}` | per resource |
| POST | `/admin/live` | `live.manage` — actions: `event_status, fight_start, round, clock, commentary, stats, scorecard, result, reset` |
| PATCH | `/admin/applications/{id}` | `applications.manage` |
| POST | `/admin/notifications` | `notifications.send` |
| PUT | `/admin/settings` | `settings.manage` |

## Share cards

`/api/og/{site|fighter|fight|event|rankings|article|video}/{slug}` returns a PNG rendered
from the database (1200×630; `?format=square` for 1080×1080).
