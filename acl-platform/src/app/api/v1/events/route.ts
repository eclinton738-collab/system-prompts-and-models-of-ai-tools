import { route } from "@/server/api";
import { listEvents } from "@/server/services/events";

export const GET = route({}, async ({ req }) => {
  const sp = req.nextUrl.searchParams;
  const when = sp.get("when");
  const events = await listEvents({ when: when === "past" || when === "upcoming" ? when : "all", country: sp.get("country") ?? undefined, city: sp.get("city") ?? undefined, month: sp.get("month") ?? undefined, type: sp.get("type") ?? undefined });
  return events.map((e) => ({ slug: e.slug, name: e.name, number: e.number, tagline: e.tagline, type: e.type, status: e.status, startsAt: e.startsAt, venue: e.venue, city: e.city, state: e.state, country: { code: e.countryCode, name: e.country.name }, fights: e._count.fights }));
});
