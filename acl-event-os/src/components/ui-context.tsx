"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { TicketTypeId } from "@/lib/types";
import { SellDialog } from "./features/sell-dialog";
import { SendDialog } from "./features/send-dialog";
import { TicketDrawer } from "./features/ticket-drawer";

export type SellMode = "sell" | "attendee" | "table";
interface Ui {
  openSell: (o?: { typeId?: TicketTypeId; mode?: SellMode; tableId?: string }) => void;
  openTicket: (ticketId: string) => void;
  openSend: (ticketId?: string) => void;
}
const Ctx = createContext<Ui | null>(null);
export const useUi = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUi must be used inside <UiProvider>");
  return v;
};

/** Mounts the dialogs that can be opened from anywhere: checkout, ticket detail, send e-ticket. */
export function UiProvider({ children }: { children: React.ReactNode }) {
  const [sell, setSell] = useState<{ typeId?: TicketTypeId; mode: SellMode; tableId?: string; key: number } | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [send, setSend] = useState<{ ticketId?: string; key: number } | null>(null);
  const api = useMemo<Ui>(() => ({
    openSell: (o) => setSell({ mode: o?.mode ?? "sell", typeId: o?.typeId, tableId: o?.tableId, key: Date.now() }),
    openTicket: setTicketId,
    openSend: (id) => setSend({ ticketId: id, key: Date.now() }),
  }), []);
  return (
    <Ctx.Provider value={api}>
      {children}
      <TicketDrawer ticketId={ticketId} onClose={() => setTicketId(null)} />
      {sell && <SellDialog key={sell.key} mode={sell.mode} initialTypeId={sell.typeId} initialTableId={sell.tableId} onClose={() => setSell(null)} />}
      {send && <SendDialog key={send.key} initialTicketId={send.ticketId} onClose={() => setSend(null)} />}
    </Ctx.Provider>
  );
}
