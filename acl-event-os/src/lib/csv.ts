export type Cell = string | number | null | undefined;

export function toCsv(headers: string[], rows: Cell[][]) {
  const esc = (v: Cell) => {
    let s = v === null || v === undefined ? "" : String(v);
    // Neutralise spreadsheet formula injection from user-entered text.
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}

export function downloadFile(filename: string, content: string | Blob, mime = "text/csv;charset=utf-8") {
  const blob = typeof content === "string" ? new Blob(["﻿", content], { type: mime }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(name: string, headers: string[], rows: Cell[][]) {
  downloadFile(`${name}.csv`, toCsv(headers, rows));
}
