"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

/**
 * Renders the signed token for a ticket.
 *
 * The payload is fetched from the server rather than assembled here — the
 * client never mints or signs a ticket code.
 */
export function QrCode({
  token,
  size = 168,
  className,
  label,
}: {
  token: string | null | undefined;
  size?: number;
  className?: string;
  label?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setDataUrl(null);
      return;
    }
    QRCode.toDataURL(token, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: size * 2,
      color: { dark: "#0A0B0E", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
          setError(false);
        }
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [token, size]);

  if (error) {
    return (
      <div
        className={cn("flex items-center justify-center border border-danger/40 bg-danger/10 text-[11px] text-danger", className)}
        style={{ width: size, height: size }}
      >
        QR unavailable
      </div>
    );
  }

  return (
    <figure className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className="relative rounded-[3px] bg-white p-2"
        style={{ width: size, height: size }}
      >
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={label ? `QR code for ${label}` : "Ticket QR code"} className="h-full w-full" />
        ) : (
          <div className="acl-skeleton h-full w-full" />
        )}
      </div>
      {label ? (
        <figcaption className="font-mono text-[11px] tracking-tight text-ink-2">{label}</figcaption>
      ) : null}
    </figure>
  );
}
