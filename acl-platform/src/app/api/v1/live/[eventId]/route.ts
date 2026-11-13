import { route, notFound } from "@/server/api";
import { getLiveSnapshot } from "@/server/services/live";

export const dynamic = "force-dynamic";
export const GET = route({ limit: 120 }, async ({ params }) => (await getLiveSnapshot(params.eventId)) ?? notFound("Event"));
