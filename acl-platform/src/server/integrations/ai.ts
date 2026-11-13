/**
 * AI boundary.
 *
 * The site calls `AiProvider` for recommendations and matchup notes. The default
 * implementation below is a transparent rules engine over league data — it is NOT
 * a language model. Swap in an LLM-backed provider (same interface) to enable
 * natural-language previews, AI search and auto-generated profiles.
 */
import { db } from "../db";
import { FIGHT_STYLES } from "@/lib/site";

export type Recommendation = { interpreted: string; fighterIds: string[]; note: string };

export interface AiProvider {
  readonly name: string;
  readonly isHeuristic: boolean;
  recommend(query: string): Promise<Recommendation>;
  matchupNotes(m: MatchupInput): string[];
}

export type MatchupInput = {
  a: { name: string; heightCm: number; reachCm: number; stance: string; style: string; age: number; koPct: number; winPct: number; fights: number };
  b: { name: string; heightCm: number; reachCm: number; stance: string; style: string; age: number; koPct: number; winPct: number; fights: number };
};

const STYLE_HINTS: Record<string, string[]> = {
  "Pressure fighter": ["pressure", "aggressive", "forward", "relentless", "come forward"],
  "Boxer-puncher": ["boxer-puncher", "boxer puncher", "all-round", "complete", "versatile"],
  "Out-boxer": ["out-boxer", "outboxer", "technical", "jab", "slick", "footwork", "range"],
  "Counter-puncher": ["counter", "defensive", "patient", "timing"],
  Swarmer: ["swarm", "volume", "inside", "busy", "work rate"],
  Slugger: ["slugger", "knockout", "ko", "power", "puncher", "brawl", "heavy hands"],
};

class HeuristicAiProvider implements AiProvider {
  readonly name = "acl-heuristics";
  readonly isHeuristic = true;

  async recommend(query: string): Promise<Recommendation> {
    const q = query.toLowerCase();
    const styles = FIGHT_STYLES.filter((s) => STYLE_HINTS[s].some((h) => q.includes(h)));
    const countries = await db.country.findMany({ select: { code: true, name: true } });
    const country = countries.find((c) => q.includes(c.name.toLowerCase()));
    const fighters = await db.fighter.findMany({
      where: { status: "ACTIVE", ...(styles.length && { style: { in: styles } }), ...(country && { countryCode: country.code }) },
      orderBy: [{ followers: { _count: "desc" } }],
      take: 6,
      select: { id: true },
    });
    const parts = [styles.length ? styles.join(" / ").toLowerCase() + "s" : null, country ? `from ${country.name}` : null].filter(Boolean);
    return {
      interpreted: parts.length ? parts.join(" ") : "popular ACL fighters",
      fighterIds: fighters.map((f) => f.id),
      note: parts.length ? `Matched on ${parts.join(" ")}.` : "No style or country recognised in your question — showing the most-followed fighters.",
    };
  }

  matchupNotes({ a, b }: MatchupInput): string[] {
    const notes: string[] = [];
    const reach = a.reachCm - b.reachCm;
    if (Math.abs(reach) >= 4) notes.push(`${reach > 0 ? a.name : b.name} holds a ${Math.abs(reach)} cm reach advantage.`);
    const h = a.heightCm - b.heightCm;
    if (Math.abs(h) >= 4) notes.push(`${h > 0 ? a.name : b.name} is the taller fighter by ${Math.abs(h)} cm.`);
    if (a.stance !== b.stance) notes.push(`Stance clash: ${a.name} (${a.stance.toLowerCase()}) against ${b.name} (${b.stance.toLowerCase()}).`);
    const ko = a.koPct - b.koPct;
    if (Math.abs(ko) >= 15) notes.push(`${ko > 0 ? a.name : b.name} has finished ${Math.max(a.koPct, b.koPct)}% of wins inside the distance, against ${Math.min(a.koPct, b.koPct)}% for the opponent.`);
    const exp = a.fights - b.fights;
    if (Math.abs(exp) >= 4) notes.push(`${exp > 0 ? a.name : b.name} brings ${Math.abs(exp)} more professional fights of experience.`);
    const age = a.age - b.age;
    if (Math.abs(age) >= 4) notes.push(`${age < 0 ? a.name : b.name} is the younger fighter by ${Math.abs(age)} years.`);
    if (a.style !== b.style) notes.push(`Styles: ${a.style.toLowerCase()} versus ${b.style.toLowerCase()}.`);
    return notes;
  }
}

export function getAiProvider(): AiProvider {
  return new HeuristicAiProvider();
}
