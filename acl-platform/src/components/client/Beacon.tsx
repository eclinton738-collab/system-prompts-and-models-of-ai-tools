"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function visitorId() {
  try {
    let id = localStorage.getItem("acl_vid");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("acl_vid", id);
    }
    return id;
  } catch {
    return undefined;
  }
}

/** First-party page-view analytics. No third-party scripts, tiny payload, sendBeacon so it never blocks navigation. */
export function PageBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const el = document.querySelector<HTMLElement>("[data-entity-type]");
    const payload = JSON.stringify({
      type: "page_view",
      path: pathname,
      entityType: el?.dataset.entityType,
      entityId: el?.dataset.entityId,
      visitorId: visitorId(),
      referrer: document.referrer || undefined,
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/v1/analytics/collect", new Blob([payload], { type: "application/json" }));
    else void fetch("/api/v1/analytics/collect", { method: "POST", body: payload, headers: { "content-type": "application/json" }, keepalive: true });
  }, [pathname]);
  return null;
}

/** Credits fan points for consuming content (read an article, watch a video) after a short dwell. */
export function EngagePing({ kind, id, delayMs = 8000 }: { kind: "read" | "watch"; id: string; delayMs?: number }) {
  useEffect(() => {
    const t = setTimeout(() => {
      void fetch("/api/v1/engage/consume", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id, visitorId: visitorId() }), keepalive: true }).catch(() => {});
    }, delayMs);
    return () => clearTimeout(t);
  }, [kind, id, delayMs]);
  return null;
}
