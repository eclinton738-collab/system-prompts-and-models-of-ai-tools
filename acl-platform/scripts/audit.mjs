// Product audit: crawls every internal link as an anonymous visitor, a fan and an admin,
// and checks status codes, runtime errors, mobile overflow and basic accessibility.
// Usage: node scripts/audit.mjs [baseUrl]   (requires the app running and demo data seeded)
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASSWORD = "AclDemo!2026";
const problems = [];
const note = (kind, url, detail) => problems.push({ kind, url, detail });

async function login(ctx, email) {
  const r = await ctx.request.post(`${BASE}/api/v1/auth/login`, { data: { email, password: PASSWORD }, headers: { origin: BASE } });
  if (!r.ok()) throw new Error(`login failed for ${email}: ${r.status()}`);
}

async function crawl(label, ctx, seeds, { checkLayout }) {
  const page = await ctx.newPage();
  const seen = new Set();
  const queue = [...seeds];
  let errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  page.on("response", (r) => { const u = r.url(); if (u.startsWith(BASE) && r.status() >= 500) note("5xx", u, `${r.status()} (while on ${page.url()})`); });
  while (queue.length) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    errors = [];
    let res;
    try { res = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 30000 }); } catch (e) { note("nav-error", path, String(e).slice(0, 120)); continue; }
    const status = res?.status() ?? 0;
    if (status >= 400) { note("http", path, String(status)); continue; }
    await page.waitForSelector("h1", { timeout: 4000 }).catch(() => {}); // streamed pages: wait past the loading skeleton
    await page.waitForTimeout(100);
    const info = await page.evaluate((checkLayout) => {
      const out = { links: [], issues: [] };
      for (const a of document.querySelectorAll("a[href]")) {
        const href = a.getAttribute("href");
        if (href.startsWith("/") && !href.startsWith("//")) out.links.push(href.split("#")[0]);
        if (!a.textContent.trim() && !a.getAttribute("aria-label") && !a.querySelector("img[alt],svg[aria-label],[aria-label]")) out.issues.push(`link without accessible name: ${href}`);
        if (href === "#" || href === "") out.issues.push("placeholder link href");
      }
      for (const b of document.querySelectorAll("button")) if (!b.textContent.trim() && !b.getAttribute("aria-label")) out.issues.push("button without accessible name");
      for (const el of document.querySelectorAll("input:not([type=hidden]),select,textarea")) {
        const id = el.id;
        if (!(el.getAttribute("aria-label") || (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || el.closest("label"))) out.issues.push(`form control without label: ${el.name || el.type}`);
      }
      for (const img of document.querySelectorAll("img")) if (!img.hasAttribute("alt")) out.issues.push("img without alt");
      if (document.querySelectorAll("h1").length !== 1) out.issues.push(`h1 count = ${document.querySelectorAll("h1").length}`);
      if (!document.title) out.issues.push("missing <title>");
      if (!document.querySelector("main")) out.issues.push("missing <main>");
      if (checkLayout && document.documentElement.scrollWidth > window.innerWidth + 1) {
        const wide = [...document.querySelectorAll("body *")].find((e) => e.getBoundingClientRect().right > window.innerWidth + 1 && !e.closest(".rail,[style*='scrollbar'],.overflow-x-auto"));
        out.issues.push(`horizontal overflow: page ${document.documentElement.scrollWidth}px > ${window.innerWidth}px${wide ? ` (${wide.tagName}.${String(wide.className).slice(0, 60)})` : ""}`);
      }
      return out;
    }, checkLayout);
    for (const i of new Set(info.issues)) note("a11y/layout", path, i);
    for (const e of new Set(errors)) note("js-error", path, e.slice(0, 200));
    for (const l of info.links) {
      if (seen.has(l) || queue.includes(l)) continue;
      if (/^\/api\/v1\/(auth|media)/.test(l) || l.startsWith("/api/og")) continue;
      // Keep the crawl finite: follow filter/pagination query strings only one level deep.
      if (l.includes("?") && path.includes("?")) continue;
      queue.push(l);
    }
  }
  await page.close();
  console.log(`${label}: ${seen.size} pages crawled`);
  return seen;
}

const browser = await chromium.launch();
const seeds = ["/", "/sitemap.xml"].slice(0, 1);

const anonDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const all = await crawl("anonymous / desktop", anonDesktop, seeds, { checkLayout: true });

const anonMobile = await browser.newContext({ ...devices["iPhone 13"] });
await crawl("anonymous / mobile", anonMobile, seeds, { checkLayout: true });

const fan = await browser.newContext({ ...devices["Pixel 7"] });
await login(fan, "fan@acl.demo");
await crawl("fan / mobile", fan, ["/", "/account", "/portal", "/notifications", "/cart"], { checkLayout: true });

const admin = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await login(admin, "admin@acl.demo");
await crawl("admin / desktop", admin, ["/admin"], { checkLayout: true });
const adminMobile = await browser.newContext({ ...devices["iPhone 13"] });
await login(adminMobile, "admin@acl.demo");
await crawl("admin / mobile", adminMobile, ["/admin", "/admin/live", "/admin/analytics", "/admin/fighters", "/admin/applications"], { checkLayout: true });

// Sitemap URLs must all resolve.
const sm = await (await anonDesktop.request.get(`${BASE}/sitemap.xml`)).text();
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
let missing = 0;
for (const p of locs) if (!all.has(p)) { const r = await anonDesktop.request.get(BASE + p); if (r.status() !== 200) { note("sitemap", p, String(r.status())); } missing++; }
console.log(`sitemap: ${locs.length} URLs, ${missing} not reached by crawl (fetched directly)`);

// Share-card generator
for (const p of ["/api/og/site", "/api/og/fighter/kenechukwu-okoro", "/api/og/fight/okoro-vs-nwosu", "/api/og/event/acl-state-wars-001", "/api/og/rankings/welterweight", "/api/og/fighter/kenechukwu-okoro?format=square"]) {
  const r = await anonDesktop.request.get(BASE + p);
  if (r.status() !== 200 || !r.headers()["content-type"]?.includes("image/png")) note("og", p, `${r.status()} ${r.headers()["content-type"]}`);
}
await browser.close();

const byKind = {};
for (const p of problems) (byKind[p.kind] ??= []).push(p);
for (const [k, list] of Object.entries(byKind)) {
  console.log(`\n== ${k} (${list.length}) ==`);
  const grouped = new Map();
  for (const p of list) grouped.set(p.detail, [...(grouped.get(p.detail) ?? []), p.url]);
  for (const [d, urls] of [...grouped].slice(0, 40)) console.log(`- ${d}\n    ${[...new Set(urls)].slice(0, 4).join("  ")}${urls.length > 4 ? `  (+${urls.length - 4})` : ""}`);
}
console.log(problems.length ? `\n${problems.length} problem(s) found` : "\nNo problems found");
process.exit(problems.length ? 1 : 0);
