import { route, notFound } from "@/server/api";
import { getEvent } from "@/server/services/events";
import { publicFight } from "@/server/serializers";

export const GET = route({}, async ({ params }) => {
  const e = await getEvent(params.slug);
  if (!e) notFound("Event");
  return {
    slug: e.slug, name: e.name, number: e.number, tagline: e.tagline, type: e.type, status: e.status, startsAt: e.startsAt, description: e.description, venue: e.venue, city: e.city, state: e.state, country: { code: e.countryCode, name: e.country.name }, broadcast: e.broadcast,
    fights: e.fights.map(publicFight),
    tickets: e.ticketTypes.map((t) => ({ id: t.id, name: t.name, section: t.section, priceMinor: t.priceMinor, currency: t.currency, remaining: Math.max(0, t.capacity - t._count.tickets), onSale: t.salesOpen })),
    programme: e.programme.map((p) => ({ slug: p.slug, name: p.name, type: p.type, startsAt: p.startsAt, venue: p.venue, city: p.city })),
    sponsors: e.sponsors.map((s) => ({ name: s.name, tier: s.tier })),
  };
});
