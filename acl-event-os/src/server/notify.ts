import type { NotificationKind, Severity } from "@/lib/types";
import { nowIso } from "./clock";
import { db } from "./store";

export function notify(kind: NotificationKind, severity: Severity, title: string, body: string, ticketId?: string) {
  const d = db();
  d.notifications.unshift({ id: `ntf_live_${++d.seq.ntf}`, kind, severity, title, body, ticketId, at: nowIso(), read: false });
  if (d.notifications.length > 200) d.notifications.length = 200;
}
