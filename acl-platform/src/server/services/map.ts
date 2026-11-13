import "server-only";
import { db } from "../db";

/** Fighters and gyms per country, keyed by ISO numeric code for the map geometry join. */
export async function getMapData() {
  const [countries, fighters, gyms] = await Promise.all([
    db.country.findMany({ orderBy: { name: "asc" } }),
    db.fighter.groupBy({ by: ["countryCode"], _count: true, where: { status: "ACTIVE" } }),
    db.gym.groupBy({ by: ["countryCode"], _count: true }),
  ]);
  const rows = countries.map((c) => ({
    code: c.code,
    numeric: c.numeric,
    name: c.name,
    aclMarket: c.aclMarket,
    fighters: fighters.find((f) => f.countryCode === c.code)?._count ?? 0,
    gyms: gyms.find((g) => g.countryCode === c.code)?._count ?? 0,
  }));
  return { rows, byNumeric: Object.fromEntries(rows.map((r) => [r.numeric, r])) };
}
