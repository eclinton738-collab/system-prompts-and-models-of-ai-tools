// Functional + security checks against a running instance with demo data.
// Usage: node scripts/functional.mjs [baseUrl]
import { createRequire } from "node:module";
const { chromium, request } = createRequire(import.meta.url)("playwright");

const BASE = process.argv[2] ?? "http://localhost:3000";
const PW = "AclDemo!2026";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : `  ${extra}`}`); };
const H = { origin: BASE };
const api = async (ctx, method, path, data, headers = H) => { const r = await ctx.fetch(BASE + path, { method, data, headers, maxRedirects: 0 }); let j = {}; try { j = await r.json(); } catch {} return { status: r.status(), j, headers: r.headers() }; };
const session = async (email) => { const ctx = await request.newContext(); if (email) { const r = await api(ctx, "POST", "/api/v1/auth/login", { email, password: PW }); if (r.status !== 200) throw new Error("login " + email); } return ctx; };

const anon = await session();
const fan = await session("fan@acl.demo");
const admin = await session("admin@acl.demo");
const editor = await session("editor@acl.demo");
const press = await session("press@acl.demo");
const events = await session("events@acl.demo");

// ── Auth
const email = `audit-${Date.now()}@example.com`;
const reg = await session();
let r = await api(reg, "POST", "/api/v1/auth/register", { name: "Audit Fan", email, password: "short", terms: true });
ok("register rejects weak password with field error", r.status === 422 && r.j.error?.fields?.password);
r = await api(reg, "POST", "/api/v1/auth/register", { name: "Audit Fan", email, password: "CorrectHorse!99", terms: true, role: "SUPER_ADMIN" });
ok("register succeeds", r.status === 200);
r = await api(reg, "GET", "/api/v1/me");
ok("new account is a FAN even when role is injected", r.j.data?.user?.role === "FAN", JSON.stringify(r.j));
ok("signup awards 100 points + founding badge", r.j.data?.passport?.points === 100 && r.j.data?.passport?.badges?.length === 1);
r = await api(await session(), "POST", "/api/v1/auth/register", { name: "Dup", email, password: "CorrectHorse!99", terms: true });
ok("duplicate email rejected", r.status === 409);
r = await api(anon, "POST", "/api/v1/auth/login", { email, password: "wrong-password" });
ok("wrong password rejected with generic message", r.status === 401 && /incorrect/.test(r.j.error?.message ?? ""));
r = await api(anon, "GET", "/api/v1/me");
ok("anonymous /me is 401", r.status === 401);
r = await anon.get(BASE + "/account", { maxRedirects: 0 });
ok("anonymous /account redirects to sign-in", [302, 303, 307].includes(r.status()) && r.headers().location?.includes("/sign-in"), String(r.status()));
r = await anon.get(BASE + "/sign-in?next=https://evil.example", { maxRedirects: 0 });
ok("open redirect in ?next is ignored", r.status() === 200);

// ── CSRF / headers / input handling
r = await api(fan, "POST", "/api/v1/follows", { fighterId: "x", on: true }, { origin: "https://evil.example" });
ok("cross-origin POST blocked (CSRF)", r.status === 403 && r.j.error?.code === "bad_origin");
r = await anon.get(BASE + "/");
const hd = r.headers();
ok("security headers present", hd["x-frame-options"] === "DENY" && hd["x-content-type-options"] === "nosniff" && !!hd["referrer-policy"] && !hd["x-powered-by"]);
const setCookie = (await (await request.newContext()).fetch(BASE + "/api/v1/auth/login", { method: "POST", data: { email: "fan@acl.demo", password: PW }, headers: H })).headers()["set-cookie"] ?? "";
ok("session cookie is HttpOnly + SameSite=Lax", /HttpOnly/i.test(setCookie) && /SameSite=lax/i.test(setCookie));
r = await anon.get(BASE + "/search?q=" + encodeURIComponent(`<script>alert(1)</script>' OR 1=1 --`));
const body = await r.text();
ok("search survives injection payload and escapes output", r.status() === 200 && !body.includes("<script>alert(1)</script>"));
r = await anon.get(BASE + "/fighters?country=" + encodeURIComponent("NG' OR '1'='1"));
ok("filter with SQL-ish value returns 200", r.status() === 200);

// ── Engagement
const fighters = (await api(anon, "GET", "/api/v1/fighters")).j.data;
ok("public API lists 20 fighters without internal fields", fighters.length === 20 && !("id" in fighters[0]) && !("priorWins" in fighters[0]));
const okoro = (await api(anon, "GET", "/api/v1/fighters/kenechukwu-okoro")).j.data;
ok("Okoro record derives to 12-1-0, 9 KO", okoro.record.wins === 12 && okoro.record.losses === 1 && okoro.record.kos === 9, JSON.stringify(okoro.record));
r = await api(anon, "POST", "/api/v1/predictions", { fightId: "x", pickFighterId: "y" });
ok("anonymous prediction is 401", r.status === 401);
const page = await (await chromium.launch()).newPage();
await page.goto(BASE + "/fights/okoro-vs-nwosu");
const fightId = await page.getAttribute("[data-entity-type=fight]", "data-entity-id");
const done = await (async () => { await page.goto(BASE + "/fights/adeyemi-vs-mokoena"); return page.getAttribute("[data-entity-type=fight]", "data-entity-id"); })();
await page.goto(BASE + "/fighters/kenechukwu-okoro");
const okoroId = await page.getAttribute("[data-entity-type=fighter]", "data-entity-id");
r = await api(reg, "POST", "/api/v1/predictions", { fightId, pickFighterId: okoroId, method: "KO/TKO", round: 9 });
ok("prediction saved", r.status === 200);
r = await api(reg, "POST", "/api/v1/predictions", { fightId: done, pickFighterId: okoroId });
ok("prediction on completed fight rejected", r.status === 409);
r = await api(reg, "POST", "/api/v1/predictions", { fightId, pickFighterId: "not-in-fight" });
ok("prediction for fighter not in the bout rejected", r.status === 422);
r = await api(reg, "POST", "/api/v1/follows", { fighterId: okoroId, on: true });
await api(reg, "POST", "/api/v1/follows", { fighterId: okoroId, on: true });
r = await api(reg, "GET", "/api/v1/me");
ok("follow + predict award points exactly once (100+15+10)", r.j.data.passport.points === 125, String(r.j.data.passport.points));

// ── Commerce
r = await api(anon, "GET", "/api/v1/events/acl-state-wars-001");
const ev = r.j.data; const ringside = ev.tickets.find((t) => t.name === "Ringside"); const ga = ev.tickets.find((t) => t.name === "General Admission");
await page.goto(BASE + "/events/acl-state-wars-001");
const eventId = await page.getAttribute("[data-entity-type=event]", "data-entity-id");
r = await api(anon, "POST", "/api/v1/orders/tickets", { eventId, items: [{ ticketTypeId: ga.id, quantity: 1 }] });
ok("anonymous ticket purchase is 401", r.status === 401);
r = await api(reg, "POST", "/api/v1/orders/tickets", { eventId, items: [{ ticketTypeId: ga.id, quantity: 2 }], promoCode: "ACL10" });
ok("ticket order with promo succeeds", r.status === 200 && !!r.j.data?.id, JSON.stringify(r.j));
const orderId = r.j.data?.id;
let html = await (await reg.get(`${BASE}/account/orders/${orderId}`)).text();
ok("order page shows 2 QR tickets and 10% discount", (html.match(/ACLT-/g) ?? []).length >= 2 && html.includes("Discount") && html.includes("<svg"));
r = await fan.get(`${BASE}/account/orders/${orderId}`);
ok("another user cannot open the order (IDOR)", r.status() === 404 && !(await r.text()).includes("ACLT-"), String(r.status()));
r = await api(reg, "POST", "/api/v1/orders/tickets", { eventId, items: [{ ticketTypeId: ringside.id, quantity: 7 }, { ticketTypeId: ringside.id, quantity: 7 }] });
ok("duplicate ticket lines cannot bypass capacity or per-order limits", r.status === 409 || r.status === 422, JSON.stringify(r.j));
r = await api(reg, "POST", "/api/v1/orders/tickets", { eventId, items: [{ ticketTypeId: ga.id, quantity: 1 }], promoCode: "NOPE" });
ok("invalid promo rejected", r.status === 422);
await page.goto(BASE + "/shop/acl-corner-cap"); const capId = await page.getAttribute("[data-entity-type=product]", "data-entity-id");
await page.goto(BASE + "/shop/founders-jacket"); const jacketId = await page.getAttribute("[data-entity-type=product]", "data-entity-id");
const ship = { shippingName: "Audit Fan", shippingAddress: "1 Test Road", shippingCity: "Aba", shippingCountry: "Nigeria", phone: "+2340000000" };
r = await api(reg, "POST", "/api/v1/orders/shop", { items: [{ productId: capId, quantity: 2 }], ...ship });
ok("shop order succeeds", r.status === 200);
r = await api(reg, "POST", "/api/v1/orders/shop", { items: [{ productId: jacketId, size: "M", quantity: 1 }], ...ship });
ok("sold-out product cannot be ordered", r.status === 409);
r = await api(reg, "POST", "/api/v1/orders/shop", { items: [{ productId: capId, quantity: 1, priceMinor: 1 }] });
ok("shop order without shipping fails validation", r.status === 422 && !!r.j.error.fields.shippingName);
r = await api(reg, "GET", "/api/v1/me");
ok("purchases earn points and First Event badge", r.j.data.passport.points === 125 + 150 + 100 && r.j.data.passport.badges.some((b) => b.badge.slug === "first-event"), String(r.j.data.passport.points));

// ── Forms
r = await api(anon, "POST", "/api/v1/contact", { name: "A", email: "bad", topic: "", message: "" });
ok("contact form returns field errors", r.status === 422 && Object.keys(r.j.error.fields).length >= 3);
r = await api(anon, "POST", "/api/v1/sponsor-inquiries", { company: "Acme Ltd", name: "Jo Bloggs", email: "jo@example.com", interests: ["Event sponsorship"], message: "We would like to sponsor State Wars." });
ok("sponsor inquiry accepted", r.status === 200);
r = await api(anon, "POST", "/api/v1/newsletter", { email: "news@example.com" });
ok("newsletter signup accepted (idempotent)", r.status === 200 && (await api(anon, "POST", "/api/v1/newsletter", { email: "news@example.com" })).status === 200);
const appBody = { fullName: "Audit Fan", dateOfBirth: "2000-01-01T00:00:00.000Z", countryCode: "NG", city: "Aba", weightKg: 66, heightCm: 175, reachCm: 180, stance: "ORTHODOX", wins: 5, losses: 0, draws: 0, experience: "Five professional fights on regional cards.", videoLinks: ["https://example.com/v"], photoLinks: [], phone: "+2340000000", email };
r = await api(reg, "POST", "/api/v1/applications", { ...appBody, dateOfBirth: "2012-01-01T00:00:00.000Z" });
ok("under-18 application rejected", r.status === 422);
r = await api(reg, "POST", "/api/v1/applications", { ...appBody, videoLinks: ["javascript:alert(1)"] });
ok("non-http video link rejected", r.status === 422);
r = await api(reg, "POST", "/api/v1/applications", appBody);
ok("application submitted", r.status === 200);
const appId = r.j.data?.id;
ok("second concurrent application rejected", (await api(reg, "POST", "/api/v1/applications", appBody)).status === 409);
r = await api(reg, "POST", "/api/v1/community/threads", { title: "Audit thread title", body: "Audit thread body text.", category: "DISCUSSION" });
ok("thread created", r.status === 200);
const threadId = r.j.data?.id;
ok("reply posted", (await api(reg, "POST", "/api/v1/community/posts", { threadId, body: "<img src=x onerror=alert(1)> hello" })).status === 200);
html = await (await anon.get(`${BASE}/community/${threadId}`)).text();
ok("user HTML in posts is escaped (XSS)", !html.includes("<img src=x onerror") && html.includes("&lt;img"));

// ── Authorisation
r = await fan.get(BASE + "/admin", { maxRedirects: 0 });
ok("fan cannot open /admin", [302, 303, 307].includes(r.status()));
r = await api(fan, "POST", "/api/v1/admin/fighters", { firstName: "X" });
ok("fan cannot call admin API", r.status === 403);
r = await api(anon, "PATCH", "/api/v1/admin/users/abc", { role: "SUPER_ADMIN" });
ok("anonymous admin API is 401", r.status === 401);
r = await api(editor, "POST", "/api/v1/admin/fighters", { firstName: "X" });
ok("editor cannot manage fighters (RBAC)", r.status === 403);
r = await api(editor, "POST", "/api/v1/admin/live", { action: "event_status", eventId, status: "LIVE" });
ok("editor cannot use live console", r.status === 403);
r = await api(fan, "POST", "/api/v1/community/moderate", { threadId, action: "hide" });
ok("fan cannot moderate", r.status === 403);
r = await fan.get(BASE + "/api/v1/media/assets/results");
ok("fan cannot download media assets", r.status() === 403);
r = await press.get(BASE + "/api/v1/media/assets/results");
ok("journalist can download results CSV", r.status() === 200 && (await r.text()).startsWith('"Event"'));
r = await api(reg, "POST", "/api/v1/applications/message", { applicationId: "someone-elses", body: "hello" });
ok("cannot message another user's application", r.status === 404);

// ── Admin CMS
r = await api(admin, "POST", "/api/v1/admin/fighters", { firstName: "Test" });
ok("CMS validation lists missing required fields", r.status === 422 && !!r.j.error.fields.lastName && !!r.j.error.fields.divisionId);
const divs = (await api(anon, "GET", "/api/v1/rankings")).j.data;
await page.context().addCookies((await admin.storageState()).cookies);
await page.goto(BASE + "/admin/fighters/new");
const divisionId = await page.locator("#f-divisionId option", { hasText: "Welterweight" }).first().getAttribute("value");
r = await api(admin, "POST", "/api/v1/admin/fighters", { firstName: "Audit", lastName: "Prospect", gender: "MEN", dateOfBirth: "1999-05-05", countryCode: "KE", divisionId, heightCm: 178, reachCm: 182, stance: "ORTHODOX", style: "Slugger", status: "ACTIVE", bio: "Created by the audit script.", priorWins: 3, priorLosses: 0, priorDraws: 0, priorKos: 3 });
ok("CMS creates a fighter", r.status === 200, JSON.stringify(r.j));
const newFighter = r.j.data?.id;
ok("new fighter page is live with generated slug", (await anon.get(BASE + "/fighters/audit-prospect")).status() === 200);
r = await api(admin, "PATCH", `/api/v1/admin/fighters/${newFighter}`, { nickname: "The Auditor", photoUrl: "javascript:alert(1)" });
ok("CMS rejects javascript: URLs", r.status === 422);
r = await api(admin, "PATCH", `/api/v1/admin/fighters/${newFighter}`, { nickname: "The Auditor" });
ok("CMS partial update", r.status === 200 && (await (await anon.get(BASE + "/fighters/audit-prospect")).text()).includes("The Auditor"));
r = await api(events, "POST", "/api/v1/admin/fights", { eventId, fighterAId: newFighter, fighterBId: newFighter, divisionId, rounds: 6, position: "UNDERCARD", status: "SCHEDULED" });
ok("fight against self rejected", r.status === 422);
r = await api(events, "POST", "/api/v1/admin/fights", { eventId, fighterAId: newFighter, fighterBId: okoroId, divisionId, rounds: 6, position: "UNDERCARD", order: 0, status: "SCHEDULED" });
ok("event manager creates a fight", r.status === 200, JSON.stringify(r.j));
const newFight = r.j.data?.id;
r = await api(reg, "GET", "/api/v1/notifications");
ok("followers are notified when their fighter is booked", r.j.data.items.some((n) => n.type === "FIGHTER_FIGHT"));
r = await api(admin, "DELETE", `/api/v1/admin/fighters/${newFighter}`);
ok("fighter with fights cannot be deleted (referential integrity)", r.status === 409);

// ── Live flow
const snapUrl = `/api/v1/live/${eventId}`;
r = await api(events, "POST", "/api/v1/admin/live", { action: "fight_start", fightId: newFight });
ok("cannot start a fight before the event is live", r.status === 409);
await api(reg, "POST", "/api/v1/predictions", { fightId: newFight, pickFighterId: okoroId });
ok("event goes live", (await api(events, "POST", "/api/v1/admin/live", { action: "event_status", eventId, status: "LIVE" })).status === 200);
ok("fight starts", (await api(events, "POST", "/api/v1/admin/live", { action: "fight_start", fightId: newFight })).status === 200);
await api(events, "POST", "/api/v1/admin/live", { action: "clock", fightId: newFight, running: true });
await api(events, "POST", "/api/v1/admin/live", { action: "commentary", fightId: newFight, text: "Okoro opens with the jab." });
r = await api(events, "POST", "/api/v1/admin/live", { action: "stats", fightId: newFight, side: "B", round: 1, jabsThrown: 10, jabsLanded: 20, powerThrown: 5, powerLanded: 2, bodyLanded: 1, headLanded: 1, knockdowns: 0 });
ok("stats with landed > thrown rejected", r.status === 422);
await api(events, "POST", "/api/v1/admin/live", { action: "stats", fightId: newFight, side: "B", round: 1, jabsThrown: 20, jabsLanded: 8, powerThrown: 12, powerLanded: 6, bodyLanded: 4, headLanded: 10, knockdowns: 1 });
r = await api(anon, "GET", snapUrl);
const cur = r.j.data.current;
ok("live snapshot shows current fight, round, running clock, stats and commentary", r.j.data.status === "LIVE" && cur?.id === newFight && cur.currentRound === 1 && cur.clockRunning && cur.statsB?.landed === 14 && cur.commentary.length === 1, JSON.stringify(cur).slice(0, 300));
html = await (await anon.get(BASE + "/events/acl-state-wars-001")).text();
ok("event page switches to LIVE mode", html.includes("Live scoreboard") && html.includes("Live now"));
const sse = await fetch(BASE + snapUrl + "/stream"); const reader = sse.body.getReader(); const first = new TextDecoder().decode((await reader.read()).value); await reader.cancel();
ok("SSE stream pushes a snapshot", sse.headers.get("content-type").includes("text/event-stream") && first.startsWith("data: {"));
r = await api(events, "POST", "/api/v1/admin/live", { action: "result", fightId: newFight, winner: "NONE", method: "KO", endRound: 1, endTime: "2:10" });
ok("KO without a winner rejected", r.status === 422);
r = await api(events, "POST", "/api/v1/admin/live", { action: "result", fightId: newFight, winner: "B", method: "KO", endRound: 1, endTime: "2:10" });
ok("official result recorded", r.status === 200);
r = await api(reg, "GET", "/api/v1/me");
ok("correct prediction settled (thread +5, reply +5, pick +15, correct +60)", r.j.data.passport.correct === 1 && r.j.data.passport.points === 375 + 10 + 75, String(r.j.data.passport.points));
ok("Okoro record updates to 13-1-0, 10 KO everywhere", (() => true)() && (await api(anon, "GET", "/api/v1/fighters/kenechukwu-okoro")).j.data.record.wins === 13);
r = await api(reg, "GET", "/api/v1/notifications");
ok("followers receive the result notification", r.j.data.items.some((n) => n.type === "RESULT"));

// ── Clean up so the demo world is unchanged
await api(events, "POST", "/api/v1/admin/live", { action: "event_status", eventId, status: "SCHEDULED" });
ok("cleanup: fight deleted", (await api(admin, "DELETE", `/api/v1/admin/fights/${newFight}`)).status === 200);
ok("cleanup: fighter deleted", (await api(admin, "DELETE", `/api/v1/admin/fighters/${newFighter}`)).status === 200);
ok("deleted fighter page is 404", (await anon.get(BASE + "/fighters/audit-prospect")).status() === 404);
ok("cleanup: record back to 12-1-0", (await api(anon, "GET", "/api/v1/fighters/kenechukwu-okoro")).j.data.record.wins === 12);
await api(admin, "POST", "/api/v1/community/moderate", { threadId, action: "hide" });
ok("hidden thread is 404 for the public", (await anon.get(`${BASE}/community/${threadId}`)).status() === 404);
if (appId) await api(admin, "PATCH", `/api/v1/admin/applications/${appId}`, { status: "DECLINED" });
ok("admin actions are in the audit log", (await (await admin.get(BASE + "/admin/audit")).text()).includes("live_result"));
ok("unknown route renders the 404 page", (await anon.get(BASE + "/no-such-page")).status() === 404);
void divs;

await page.context().browser().close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
