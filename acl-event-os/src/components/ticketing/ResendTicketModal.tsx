"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { apiSend, ApiError } from "@/lib/client/api";
import { useAcl } from "@/lib/client/provider";

/** Re-deliver an e-ticket to the holder on record. */
export function ResendTicketModal({
  open,
  onClose,
  ticketId: initialTicketId,
}: {
  open: boolean;
  onClose: () => void;
  ticketId?: string;
}) {
  const toast = useToast();
  const { refresh } = useAcl();
  const [ticketId, setTicketId] = useState(initialTicketId ?? "");
  const [via, setVia] = useState<"EMAIL" | "SMS" | "WHATSAPP">("EMAIL");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const id = (initialTicketId ?? ticketId).trim().toUpperCase();
    if (!id) {
      setError("Enter the ticket ID to re-send.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { to } = await apiSend<{ to: string }>(`/api/tickets/${id}/resend`, { via });
      toast.push({ tone: "success", title: "E-ticket sent", body: `${id} delivered to ${to}.` });
      await refresh();
      onClose();
      setTicketId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the e-ticket.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send e-ticket"
      subtitle="Re-deliver the ticket and its QR credential to the holder on record."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={busy}>
            Send
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {initialTicketId ? (
          <Field label="Ticket">
            <Input value={initialTicketId} readOnly className="cursor-default font-mono" />
          </Field>
        ) : (
          <Field label="Ticket ID" required error={error ?? undefined}>
            <Input
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value.toUpperCase())}
              placeholder="ACL-VIP-000482"
              className="font-mono uppercase"
              invalid={Boolean(error)}
            />
          </Field>
        )}
        <Field label="Deliver via">
          <Select value={via} onChange={(e) => setVia(e.target.value as typeof via)}>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
          </Select>
        </Field>
        {initialTicketId && error ? <p className="text-[11px] text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}
