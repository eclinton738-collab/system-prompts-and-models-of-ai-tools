import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { getFighterProfile, fighterName } from "@/server/services/fighters";
import { getFight, resultLine } from "@/server/services/fights";
import { getDivisionRankings } from "@/server/services/rankings";
import { fmtEventDate, label } from "@/lib/format";

/**
 * Card generator. Every shareable graphic (fighter card, fight card, result, event,
 * rankings, article, video) is rendered on demand from database fields, so cards are
 * never out of date. Used for Open Graph/X previews and the "Instagram card" download.
 *   /api/og/fighter/{slug} · /api/og/fight/{slug} · /api/og/event/{slug}
 *   /api/og/rankings/{division} · /api/og/article/{slug} · /api/og/video/{slug} · /api/og/site
 * Add ?format=square for a 1080×1080 social post.
 */
const C = { ink: "#08080a", coal: "#15151a", red: "#e3182d", gold: "#d6ab3b", bone: "#f6f4ef", fog: "#a3a3ad" };

type Card = { kicker: string; title: string; titleB?: string; sub?: string; stats?: [string, string][]; rows?: string[]; footer?: string; tone?: "red" | "gold" };

async function build(type: string, slug: string): Promise<Card | null> {
  switch (type) {
    case "site":
      return { kicker: "Africa's premier combat sports league", title: "AFRICA COMBAT LEAGUE", sub: "Fighters · Rankings · Champions · Live events", tone: "red" };
    case "fighter": {
      const f = await getFighterProfile(slug);
      if (!f) return null;
      return {
        kicker: f.isChampion ? `ACL ${f.division.name} champion` : f.ranking ? `#${f.ranking.rank} ACL ${f.division.name}` : `ACL ${f.division.name}`,
        title: `${f.firstName} ${f.nickname ? `“${f.nickname}” ` : ""}`.toUpperCase(), titleB: f.lastName.toUpperCase(), sub: f.country.name.toUpperCase(),
        stats: [["RECORD", `${f.record.wins}–${f.record.losses}–${f.record.draws}`], ["KO", String(f.record.kos)], ["RANK", f.isChampion ? "C" : f.ranking ? `#${f.ranking.rank}` : "NR"]], tone: f.isChampion ? "gold" : "red",
      };
    }
    case "fight": {
      const f = await getFight(slug);
      if (!f) return null;
      const res = resultLine(f);
      return {
        kicker: res ? "Official result" : `${f.event.name} · ${f.isTitleFight ? "Title fight" : label(f.position)}`,
        title: f.fighterA.lastName.toUpperCase(), titleB: `VS ${f.fighterB.lastName.toUpperCase()}`,
        sub: res ?? `${fmtEventDate(f.event.startsAt)} · ${f.event.city}`,
        stats: [[f.fighterA.lastName.toUpperCase(), `${f.fighterA.record.wins}–${f.fighterA.record.losses}–${f.fighterA.record.draws}`], [f.division.name.toUpperCase(), `${f.rounds} RDS`], [f.fighterB.lastName.toUpperCase(), `${f.fighterB.record.wins}–${f.fighterB.record.losses}–${f.fighterB.record.draws}`]],
        tone: res ? "gold" : "red",
      };
    }
    case "event": {
      const e = await db.event.findUnique({ where: { slug }, include: { country: true, fights: { where: { status: { not: "CANCELLED" } }, orderBy: { order: "desc" }, take: 5, include: { fighterA: { select: { lastName: true } }, fighterB: { select: { lastName: true } } } } } });
      if (!e) return null;
      const [head, ...rest] = e.name.split(":");
      const days = Math.ceil((e.startsAt.getTime() - Date.now()) / 864e5);
      return { kicker: e.status === "COMPLETED" ? "Results" : days > 0 ? `${days} days to go` : "Fight night", title: (rest.join(":").trim() || head).toUpperCase(), sub: `${fmtEventDate(e.startsAt)} · ${e.venue}, ${e.city}`, rows: e.fights.map((f) => `${f.fighterA.lastName} vs ${f.fighterB.lastName}`), footer: rest.length ? head.toUpperCase() : undefined };
    }
    case "rankings": {
      const r = await getDivisionRankings(slug);
      if (!r) return null;
      return { kicker: "Official ACL rankings", title: r.division.name.toUpperCase(), rows: [...(r.champion ? [`C   ${fighterName(r.champion)}`] : []), ...r.contenders.slice(0, 5).map((c) => `#${c.rank}  ${fighterName(c.fighter)}`)], tone: "gold" };
    }
    case "article": {
      const a = await db.article.findFirst({ where: { slug, status: "PUBLISHED" }, select: { title: true, category: true } });
      return a ? { kicker: label(a.category), title: a.title.toUpperCase() } : null;
    }
    case "video": {
      const v = await db.video.findFirst({ where: { slug, status: "PUBLISHED" }, select: { title: true, category: true } });
      return v ? { kicker: `ACL Watch · ${label(v.category)}`, title: v.title.toUpperCase(), tone: "gold" } : null;
    }
    default:
      return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const [type = "site", slug = ""] = (await params).path;
  const card = await build(type, slug);
  if (!card) return new Response("Not found", { status: 404 });
  const square = req.nextUrl.searchParams.get("format") === "square";
  const W = square ? 1080 : 1200;
  const H = square ? 1080 : 630;
  const accent = card.tone === "gold" ? C.gold : C.red;
  const long = (card.title + (card.titleB ?? "")).length;
  const size = card.titleB ? (long > 22 ? 92 : 116) : long > 60 ? 54 : long > 34 ? 72 : 100;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: `linear-gradient(135deg, ${C.coal} 0%, ${C.ink} 60%)`, color: C.bone, fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ position: "absolute", top: -160, right: -160, width: 560, height: 560, borderRadius: 560, background: accent, opacity: 0.28, display: "flex" }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: 14, height: "100%", background: accent, display: "flex" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", background: C.red, color: "#fff", fontSize: 40, fontWeight: 900, padding: "6px 18px", letterSpacing: 2 }}>ACL</div>
            <div style={{ display: "flex", marginLeft: 18, fontSize: 22, letterSpacing: 5, color: C.fog }}>AFRICA COMBAT LEAGUE</div>
          </div>
          {card.footer ? <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: C.gold }}>{card.footer}</div> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: C.gold, textTransform: "uppercase", marginBottom: 14 }}>{card.kicker}</div>
          <div style={{ display: "flex", fontSize: card.titleB ? size * 0.5 : size, fontWeight: 900, lineHeight: 1, letterSpacing: -1, color: card.titleB ? C.fog : C.bone }}>{card.title}</div>
          {card.titleB ? <div style={{ display: "flex", fontSize: size, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>{card.titleB}</div> : null}
          {card.sub ? <div style={{ display: "flex", fontSize: 30, marginTop: 20, color: C.bone }}>{card.sub}</div> : null}
          {card.rows ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
              {card.rows.map((r, i) => (
                <div key={i} style={{ display: "flex", fontSize: 30, padding: "7px 0", borderTop: `1px solid #2a2a31`, color: i === 0 ? C.bone : C.fog, fontWeight: i === 0 ? 800 : 500 }}>{r}</div>
              ))}
            </div>
          ) : null}
        </div>
        {card.stats ? (
          <div style={{ display: "flex" }}>
            {card.stats.map(([k, v]) => (
              <div key={k} style={{ display: "flex", flexDirection: "column", marginRight: 22, padding: "12px 26px", border: "2px solid #34343c", background: "rgba(0,0,0,0.45)" }}>
                <div style={{ display: "flex", fontSize: 18, letterSpacing: 4, color: C.fog }}>{k}</div>
                <div style={{ display: "flex", fontSize: 52, fontWeight: 900 }}>{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 4, color: C.fog }}>THE DIGITAL HOME OF AFRICAN COMBAT SPORTS</div>
        )}
      </div>
    ),
    { width: W, height: H, headers: { "cache-control": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400" } },
  );
}
