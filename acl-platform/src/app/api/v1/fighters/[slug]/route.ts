import { route, notFound } from "@/server/api";
import { getFighterProfile } from "@/server/services/fighters";
import { listFights } from "@/server/services/fights";
import { publicFight, publicFighter } from "@/server/serializers";

export const GET = route({}, async ({ params }) => {
  const f = await getFighterProfile(params.slug);
  if (!f) notFound("Fighter");
  const fights = await listFights({ fighterId: f.id });
  return { ...publicFighter(f), bio: f.bio, quote: f.quote, followers: f.followers, gym: f.gym ? { slug: f.gym.slug, name: f.gym.name } : null, coach: f.coach?.name ?? null, titles: f.titleReigns.map((t) => ({ division: t.division.name, wonAt: t.wonAt, lostAt: t.lostAt })), fights: fights.map(publicFight) };
});
