# Roadmap

## Built in this prototype

| Phase | Scope | State |
| --- | --- | --- |
| 1 — Core ACL | Home, events + calendar, fighters, fight center, rankings, champions, news, watch, search, admin CMS | Built |
| 2 — Commerce | Ticketing with QR tickets, shop, cart, checkout, promo codes, inventory, fan accounts | Built on the mock payment provider |
| 3 — Community | Following, alerts, predictions, fan points and ranks, badges, ACL Passport, leaderboards, threads, polls, moderation | Built |
| 4 — Professional ecosystem | Fighter applications, scouting pipeline, fighter portal, gym directory, media center, sponsor portal | Built |
| 5 — Advanced | Live scoreboard and console, round-by-round statistics model, share-card generator, country rankings, combat map, personalised strips, rules-based recommendations | Foundations built |

## Needed before public launch

1. **Real content**: fighter data, photography, video sources, legal copy reviewed by counsel.
2. **Payments**: implement `PaymentProvider` for the launch markets (card + mobile money),
   webhooks for asynchronous confirmation, refunds.
3. **Email / SMS / WhatsApp**: verification, password reset, order and ticket delivery,
   notification channels.
4. **Media pipeline**: object storage upload flow in the CMS, image CDN, HLS video with
   entitlement-signed URLs for premium content.
5. **Gate tooling**: ticket scanner app that sets `Ticket.checkedInAt` (drives "events
   attended" and the attendance badge).
6. **Hardening**: CSP, shared rate-limit store, error monitoring, backups, penetration test.
7. **Caching**: move header personalisation client-side so public pages cache at the CDN.

## Next

- Premium subscription (entitlements already modelled via `User.premium` / `Video.premium`).
- Native mobile apps and smart-TV app on the existing API.
- Automated scoring / punch-stat provider on the live command API.
- LLM-backed `AiProvider`: fight previews, natural-language search, profile drafts.
- Local languages (French, Swahili, Hausa, Yoruba, Igbo, Arabic, Portuguese).
- Fighter monetisation: merchandise revenue share reporting, fan memberships.
- Community at scale: reactions, fan-club pages, automated moderation queue.
