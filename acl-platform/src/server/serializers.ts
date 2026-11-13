import type { FighterCard } from "./services/fighters";
import type { FightCard } from "./services/fights";
import { resultLine } from "./services/fights";

/** Stable public API shapes. Internal columns (ids of staff, notes, raw rows) never leak through these. */
export function publicFighter(f: FighterCard) {
  return {
    slug: f.slug, firstName: f.firstName, lastName: f.lastName, nickname: f.nickname, gender: f.gender, country: { code: f.countryCode, name: f.country.name }, state: f.state, city: f.city,
    division: { slug: f.division.slug, name: f.division.name }, heightCm: f.heightCm, reachCm: f.reachCm, stance: f.stance, style: f.style, status: f.status, dateOfBirth: f.dateOfBirth,
    record: f.record, champion: f.isChampion, rank: f.ranking?.rank ?? null, photoUrl: f.photoUrl,
  };
}

export function publicFight(f: FightCard) {
  return {
    slug: f.slug, status: f.status, position: f.position, order: f.order, division: f.division.name, rounds: f.rounds, roundMinutes: f.roundMinutes, titleFight: f.isTitleFight, fightType: f.fightType,
    event: { slug: f.event.slug, name: f.event.name, startsAt: f.event.startsAt, city: f.event.city, country: f.event.countryCode },
    fighterA: publicFighter(f.fighterA), fighterB: publicFighter(f.fighterB),
    result: f.status === "COMPLETED" ? { winner: f.winnerId ? (f.winnerId === f.fighterA.id ? f.fighterA.slug : f.fighterB.slug) : null, method: f.method, round: f.endRound, time: f.endTime, summary: resultLine(f) } : null,
  };
}
