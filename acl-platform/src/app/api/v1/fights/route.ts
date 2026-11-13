import { route } from "@/server/api";
import { listFights } from "@/server/services/fights";
import { publicFight } from "@/server/serializers";

export const GET = route({}, async ({ req }) => {
  const s = req.nextUrl.searchParams.get("status")?.toUpperCase();
  const status = s === "SCHEDULED" || s === "LIVE" || s === "COMPLETED" ? s : undefined;
  return (await listFights({ status, take: 100 })).map(publicFight);
});
