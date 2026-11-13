import { route } from "@/server/api";
import { getChampions } from "@/server/services/rankings";
import { publicFighter } from "@/server/serializers";

export const GET = route({}, async () => (await getChampions()).map((c) => ({ division: { slug: c.division.slug, name: c.division.name }, champion: c.fighter ? publicFighter(c.fighter) : null, since: c.reign?.wonAt ?? null, defenses: c.defenses, nextDefense: c.nextFight?.slug ?? null })));
