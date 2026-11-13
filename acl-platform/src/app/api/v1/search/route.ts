import { route } from "@/server/api";
import { globalSearch } from "@/server/services/search";
import { fightTitle } from "@/server/services/fights";

export const GET = route({ limit: 90 }, async ({ req }) => {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const res = await globalSearch(q, req.nextUrl.searchParams.get("quick") ? 5 : 12);
  if (!res) return { total: 0, fighters: [], events: [], fights: [], articles: [], videos: [], gyms: [], divisions: [] };
  return {
    q: res.q, total: res.total,
    fighters: res.fighters.map((f) => ({ slug: f.slug, firstName: f.firstName, lastName: f.lastName, nickname: f.nickname, country: f.countryCode, division: f.division.name, record: f.record, champion: f.isChampion, rank: f.ranking?.rank ?? null })),
    events: res.events.map((e) => ({ slug: e.slug, name: e.name, startsAt: e.startsAt, city: e.city, status: e.status })),
    fights: res.fights.map((f) => ({ slug: f.slug, title: fightTitle(f), event: f.event.name, status: f.status })),
    articles: res.articles.map((a) => ({ slug: a.slug, title: a.title, publishedAt: a.publishedAt })),
    videos: res.videos.map((v) => ({ slug: v.slug, title: v.title, durationSec: v.durationSec })),
    gyms: res.gyms.map((g) => ({ slug: g.slug, name: g.name, city: g.city })),
    divisions: res.divisions.map((d) => ({ slug: d.slug, name: d.name })),
  };
});
