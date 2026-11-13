import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getSettings, text } from "@/lib/settings";

/**
 * Default share card (WhatsApp, Instagram, X, Facebook). Events and fighters
 * will get their own cards built on the same layout. Every card carries the
 * founder photo slot, filled from the `founder.photo_url` setting.
 */
export const alt = "Africa Combat League";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const settings = await getSettings();
  const anton = await readFile(
    join(process.cwd(), "node_modules/@fontsource/anton/files/anton-latin-400-normal.woff"),
  );
  const founderPhoto = text(settings, "founder.photo_url");
  const founderName = text(settings, "founder.name");
  const initials = founderName
    .split(" ")
    .map((part) => part[0])
    .join("");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#f2efe9",
          padding: 64,
          fontFamily: "Anton",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 72, borderBottom: "10px solid #d4281e", lineHeight: 1.1 }}>
            {text(settings, "brand.short_name")}
          </div>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 4, color: "#aaa59c" }}>
            {text(settings, "brand.name").toUpperCase()}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontSize: 132, lineHeight: 1, textTransform: "uppercase" }}>
          {text(settings, "brand.tagline")
            .split(/(?<=\.)\s+/)
            .map((line, index) => (
              <div key={line} style={{ display: "flex", color: index === 1 ? "#d4281e" : "#f2efe9" }}>
                {line}
              </div>
            ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Bamboo ring motif */}
          <div style={{ display: "flex", height: 14, borderRadius: 7, background: "#c9a24b" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Founder photo slot */}
            {founderPhoto ? (
              <img
                src={founderPhoto}
                alt=""
                width={84}
                height={84}
                style={{ borderRadius: 42, border: "3px solid #c9a24b", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  border: "3px solid #c9a24b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 34,
                  color: "#c9a24b",
                }}
              >
                {initials}
              </div>
            )}
            <div style={{ display: "flex", fontSize: 36, color: "#c9a24b", textTransform: "uppercase" }}>
              {text(settings, "founder.footer_line")}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Anton", data: anton, weight: 400, style: "normal" }] },
  );
}
