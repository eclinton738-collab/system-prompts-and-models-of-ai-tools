import { route } from "@/server/api";
import { listFighters } from "@/server/services/fighters";
import { publicFighter } from "@/server/serializers";

export const GET = route({}, async ({ req }) => {
  const sp = req.nextUrl.searchParams;
  const g = (k: string) => sp.get(k) ?? undefined;
  const list = await listFighters({ q: g("q"), country: g("country"), division: g("division"), gender: g("gender"), status: g("status"), gym: g("gym"), style: g("style"), sort: g("sort"), champion: g("champion") === "true", undefeated: g("undefeated") === "true" });
  return list.map(publicFighter);
});
