"use client";

import { useState } from "react";
import { api } from "./api";

/** WhatsApp-first sharing. `image` is a generated share card (see /api/og) fans can save for Instagram. */
export function ShareButtons({ path, title, image, compact }: { path: string; title: string; image?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}${path}`;
  const log = (channel: string) => void api("/api/v1/engage/share", { body: { path, channel }, redirectOn401: false });
  const open = (channel: string, href: string) => {
    log(channel);
    window.open(href, "_blank", "noopener,noreferrer");
  };
  const item = "inline-flex min-h-10 items-center gap-1.5 border border-line px-3 text-xs font-semibold uppercase tracking-widest text-fog hover:border-gold hover:text-bone";
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Share">
      {!compact && <span className="text-xs font-semibold uppercase tracking-widest text-fog">Share</span>}
      <button type="button" className={item} onClick={() => open("whatsapp", `https://wa.me/?text=${encodeURIComponent(`${title} ${url()}`)}`)}>WhatsApp</button>
      <button type="button" className={item} onClick={() => open("x", `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url())}`)}>X</button>
      <button type="button" className={item} onClick={() => open("facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`)}>Facebook</button>
      {image && (
        <a className={item} href={image} download onClick={() => log("instagram")} title="Download a share card for Instagram">
          Instagram card
        </a>
      )}
      <button
        type="button"
        className={item}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url());
            setCopied(true);
            log("copy");
            setTimeout(() => setCopied(false), 1800);
          } catch {
            window.prompt("Copy this link", url());
          }
        }}
      >
        <span aria-live="polite">{copied ? "Copied ✓" : "Copy link"}</span>
      </button>
    </div>
  );
}
