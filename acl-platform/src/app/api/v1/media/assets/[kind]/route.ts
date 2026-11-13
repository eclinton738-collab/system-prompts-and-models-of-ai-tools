import { route, ApiError, notFound } from "@/server/api";
import { db } from "@/server/db";
import { listFighters, fighterFullName } from "@/server/services/fighters";
import { listFights, resultLine } from "@/server/services/fights";
import { getEvent } from "@/server/services/events";
import { age, fmtEventDate, label } from "@/lib/format";

const file = (body: string, name: string, type: string) => new Response(body, { headers: { "content-type": `${type}; charset=utf-8`, "content-disposition": `attachment; filename="${name}"`, "cache-control": "private, no-store" } });
const csv = (rows: (string | number | null)[][]) => rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

/** Downloadable media assets generated from the live database. Accredited roles only. */
export const GET = route({ permission: "media.download" }, async ({ params, req }) => {
  switch (params.kind) {
    case "logo":
      return file(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 40"><path d="M2 2H38L44 8V30L22 38 2 30Z" fill="#e3182d"/><path d="M8 8H36V26L22 31.5 8 26Z" fill="#08080a"/><path d="M22 11 30 26H26.2L24.8 23H19.2L17.8 26H14ZM20.5 20H23.5L22 16.6Z" fill="#d6ab3b"/><text x="52" y="30" font-family="Arial Narrow,Impact,sans-serif" font-weight="900" font-size="30" fill="#08080a">ACL</text></svg>`, "acl-logo.svg", "image/svg+xml");
    case "fighter-bios": {
      const fighters = await listFighters({ status: "ACTIVE" });
      return file(fighters.map((f) => `${fighterFullName(f).toUpperCase()}\n${f.country.name} · ${f.division.name}${f.isChampion ? " · ACL CHAMPION" : f.ranking ? ` · #${f.ranking.rank}` : ""}\nRecord: ${f.record.wins}-${f.record.losses}-${f.record.draws} (${f.record.kos} KO) · Age ${age(f.dateOfBirth)} · ${f.heightCm} cm · Reach ${f.reachCm} cm · ${label(f.stance)}\n${f.bio}\n`).join("\n----------------------------------------\n\n"), "acl-fighter-bios.txt", "text/plain");
    }
    case "results": {
      const fights = await listFights({ status: "COMPLETED" });
      return file(csv([["Event", "Date", "Division", "Fighter A", "Fighter B", "Winner", "Method", "Round", "Time", "Title fight"], ...fights.map((f) => [f.event.name, f.event.startsAt.toISOString().slice(0, 10), f.division.name, `${f.fighterA.firstName} ${f.fighterA.lastName}`, `${f.fighterB.firstName} ${f.fighterB.lastName}`, f.winnerId ? (f.winnerId === f.fighterA.id ? f.fighterA.lastName : f.fighterB.lastName) : "Draw", f.method, f.endRound, f.endTime, f.isTitleFight ? "Yes" : "No"])]), "acl-official-results.csv", "text/csv");
    }
    case "fight-card": {
      const e = await getEvent(req.nextUrl.searchParams.get("event") ?? "");
      if (!e) notFound("Event");
      return file(`${e.name.toUpperCase()}\n${fmtEventDate(e.startsAt)} — ${e.venue}, ${e.city}, ${e.country.name}\n\n` + e.fights.map((f) => `${label(f.position).toUpperCase()} — ${f.division.name}, ${f.rounds} rounds${f.isTitleFight ? " (ACL title)" : ""}\n  ${fighterFullName(f.fighterA)} (${f.fighterA.record.wins}-${f.fighterA.record.losses}-${f.fighterA.record.draws}, ${f.fighterA.country.name})\n  vs\n  ${fighterFullName(f.fighterB)} (${f.fighterB.record.wins}-${f.fighterB.record.losses}-${f.fighterB.record.draws}, ${f.fighterB.country.name})${resultLine(f) ? `\n  RESULT: ${resultLine(f)}` : ""}\n`).join("\n"), `${e.slug}-fight-card.txt`, "text/plain");
    }
    case "media-kit": {
      const [fighters, events, divisions] = await Promise.all([db.fighter.count({ where: { status: "ACTIVE" } }), db.event.count({ where: { type: "FIGHT_NIGHT" } }), db.division.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } })]);
      return file(`AFRICA COMBAT LEAGUE — MEDIA KIT\n\nAfrica's premier combat sports league.\n\nKEY FACTS\n- Active fighters: ${fighters}\n- Fight nights staged and scheduled: ${events}\n- Championship divisions: ${divisions.map((d) => d.name).join(", ")}\n\nBRAND\n- Name: Africa Combat League (ACL)\n- Colours: Black #08080A, Red #E3182D, White #F6F4EF, Gold #D6AB3B\n- Always write "ACL" in capitals. Do not alter the crest.\n\nGenerated ${new Date().toISOString().slice(0, 10)} from the ACL platform.\n`, "acl-media-kit.txt", "text/plain");
    }
    default:
      throw new ApiError(404, "not_found", "Unknown asset.");
  }
});
