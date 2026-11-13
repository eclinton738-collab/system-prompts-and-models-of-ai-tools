import type { NextRequest } from "next/server";
import { getLiveSnapshot } from "@/server/services/live";

export const dynamic = "force-dynamic";

/**
 * Live scoreboard stream (Server-Sent Events).
 * Each connection polls the database every 2s and pushes only when the snapshot changes.
 * To scale out, replace the poll with a pub/sub subscription (Redis / Postgres LISTEN) fed by
 * the live console or an automated scoring provider — clients and payload stay the same.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const enc = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    async start(controller) {
      let last = "";
      let ticks = 0;
      const push = async () => {
        try {
          const snap = await getLiveSnapshot(eventId);
          if (!snap) return controller.close();
          const { serverTime, ...rest } = snap;
          const sig = JSON.stringify(rest);
          if (sig !== last) {
            last = sig;
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ ...rest, serverTime })}\n\n`));
          } else if (++ticks % 10 === 0) controller.enqueue(enc.encode(`: keep-alive\n\n`));
        } catch {
          /* transient DB error: keep the stream open */
        }
      };
      await push();
      timer = setInterval(push, 2000);
      req.signal.addEventListener("abort", () => {
        clearInterval(timer);
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      clearInterval(timer);
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
}
