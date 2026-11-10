#!/usr/bin/env node
/**
 * End-to-end checks for the critical flows, run against a live server:
 *   npm run dev   (or npm start)   then   npm run test:flows
 * The script resets demo data first, so numbers are deterministic.
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";
let cookie = "acl_user=usr_clinton";
let passed = 0, failed = 0;

async function rpc(action, body = {}, as) {
  const res = await fetch(`${BASE}/api/rpc/${action}`, { method: "POST", headers: { "content-type": "application/json", cookie: as ? `acl_user=${as}` : cookie }, body: JSON.stringify(body) });
  return { status: res.status, ...(await res.json()) };
}
const state = async () => (await fetch(`${BASE}/api/state`, { headers: { cookie } })).json();
function check(name, cond, detail = "") {
  if (cond) { passed++; console.log(`  ✓ ${name}`); } else { failed++; console.log(`  ✗ ${name} ${detail}`); }
}
const scan = (payload, extra = {}, as) => rpc("checkin.scan", { payload, gateId: "G1", deviceId: "TEST-01", mode: "QR", ...extra }, as);
const buyer = { name: "Test Buyer", phone: "08031234567", email: "buyer@example.com" };

console.log("\nSeed integrity (figures derived from records)");
await rpc("settings.reset");
let s = await state();
const paid = (t) => s.payments.find((p) => p.id === t.paymentId)?.status === "PAID";
const sold = s.tickets.filter((t) => paid(t) && ["ACTIVE", "USED", "SUSPENDED"].includes(t.status));
check("327 tickets sold", sold.length === 327, `got ${sold.length}`);
check("revenue ₦8,730,000", sold.reduce((a, t) => a + t.pricePaid, 0) === 8_730_000);
check("186 checked in", sold.filter((t) => t.status === "USED").length === 186);
check("24 admitted in the last hour", s.checkIns.filter((c) => c.result === "GRANTED" && Date.parse(c.at) > Date.parse(s.now) - 3600e3).length === 24);
check("500 places of inventory", s.seats.length === 500);

console.log("\nPurchase: customer → ticket → payment → paid → QR");
const buy = await rpc("tickets.purchase", { ...buyer, typeId: "VIP", quantity: 2, method: "CARD" });
check("purchase accepted", buy.ok, buy.error);
check("payment PAID", buy.data?.payment.status === "PAID");
check("2 tickets with server-issued sequential IDs", buy.data?.tickets.length === 2 && buy.data.tickets[0].id === "ACL-VIP-000483" && buy.data.tickets[1].id === "ACL-VIP-000484");
check("signed QR token issued", /^ACL1\.evt_lions_den_1\.ACL-VIP-000483\..{20,}$/.test(buy.data?.tickets[0].qrToken ?? ""));
check("seat allocated", !!buy.data?.tickets[0].seatId);
check("validation rejects bad phone/email", (await rpc("tickets.purchase", { ...buyer, phone: "123", email: "nope", typeId: "GEN", quantity: 1, method: "CARD" })).status === 422);
check("client cannot inject a ticket ID", (await rpc("tickets.purchase", { ...buyer, id: "ACL-VIP-999999", typeId: "GEN", quantity: 1, method: "CARD" })).data?.tickets[0].id === "ACL-GEN-000522");

console.log("\nValid entry");
const token = buy.data.tickets[0].qrToken;
const ok = await scan(token);
check("ACCESS GRANTED", ok.data?.checkIn.result === "GRANTED", JSON.stringify(ok));
check("gate / operator / device recorded", ok.data?.checkIn.gateId === "G1" && ok.data.checkIn.operatorId === "usr_clinton" && ok.data.checkIn.deviceId === "TEST-01");

console.log("\nDuplicate entry");
const dup = await scan(token, { gateId: "G2" });
check("second scan REJECTED as DUPLICATE", dup.data?.checkIn.result === "REJECTED" && dup.data.checkIn.reason === "DUPLICATE");
check("first-scan details returned", dup.data?.firstScan?.gateName === "Main Entrance");
s = await state();
check("security event logged", s.securityEvents.some((e) => e.type === "DUPLICATE" && e.ticketRef === "ACL-VIP-000483"));
check("critical notification raised", s.notifications.some((n) => n.severity === "CRITICAL" && n.ticketId === "ACL-VIP-000483"));

console.log("\nUnpaid / refunded / wrong event / forged");
const kit = Object.fromEntries(s.demoKit.map((k) => [k.label, k]));
const reason = async (label, extra) => (await scan(kit[label].payload, extra)).data?.checkIn.reason;
check("pending payment → PAYMENT_PENDING", (await reason("Payment pending")) === "PAYMENT_PENDING");
check("refunded → REFUNDED", (await reason("Refunded")) === "REFUNDED");
check("suspended → SUSPENDED", (await reason("Suspended")) === "SUSPENDED");
check("other event → WRONG_EVENT", (await reason("Another event")) === "WRONG_EVENT");
check("forged signature → TAMPERED_QR", (await reason("Forged signature")) === "TAMPERED_QR");
check("fake ID → NOT_FOUND", (await reason("Fake ticket ID")) === "NOT_FOUND");
check("unsigned raw ID via camera → UNSIGNED_QR", (await scan("ACL-GEN-000521")).data?.checkIn.reason === "UNSIGNED_QR");
check("garbage → MALFORMED", (await scan("https://example.com/free-ticket")).data?.checkIn.reason === "MALFORMED");
check("General at VIP Entrance → WRONG_GATE (ticket not consumed)", (await scan(kit["Valid, unused"].payload, { gateId: "G3" })).data?.checkIn.reason === "WRONG_GATE");

console.log("\nFailed card payment");
const declined = await rpc("tickets.purchase", { ...buyer, typeId: "GEN", quantity: 1, method: "CARD", simulateDecline: true });
check("payment FAILED, ticket VOID, no seat", declined.data?.payment.status === "FAILED" && declined.data.tickets[0].status === "VOID" && !declined.data.tickets[0].seatId);
check("failed ticket → PAYMENT_FAILED at gate", (await scan(declined.data.tickets[0].qrToken)).data?.checkIn.reason === "PAYMENT_FAILED");

console.log("\nBank transfer: pending → confirm → admit; refund → deny");
const bank = await rpc("tickets.purchase", { ...buyer, typeId: "GEN", quantity: 1, method: "BANK_TRANSFER" });
check("transfer starts PENDING", bank.data?.payment.status === "PENDING");
check("pending ticket denied", (await scan(bank.data.tickets[0].qrToken)).data?.checkIn.reason === "PAYMENT_PENDING");
check("finance confirms", (await rpc("payments.confirm", { paymentId: bank.data.payment.id })).data?.status === "PAID");
const refund = await rpc("payments.refund", { paymentId: bank.data.payment.id, reason: "Customer request" });
check("refund succeeds", refund.data?.status === "REFUNDED");
check("refunded ticket denied", (await scan(bank.data.tickets[0].qrToken)).data?.checkIn.reason === "REFUNDED");
check("used ticket cannot be refunded", (await rpc("payments.refund", { paymentId: buy.data.payment.id, reason: "Trying it on" })).ok === false);

console.log("\nManual lookup");
const manual = await scan("acl-vip-000484", { mode: "MANUAL" });
check("manual entry by ticket ID → GRANTED", manual.data?.checkIn.result === "GRANTED" && manual.data.checkIn.mode === "MANUAL");
check("manual entry again → DUPLICATE", (await scan("ACL-VIP-000484", { mode: "MANUAL" })).data?.checkIn.reason === "DUPLICATE");

console.log("\nConcurrent scan: 25 devices, same ticket, same instant");
const race = await Promise.all(Array.from({ length: 25 }, (_, i) => scan(kit["Valid, unused"].payload, { deviceId: `RACE-${String(i).padStart(2, "0")}`, gateId: i % 2 ? "G1" : "G2" })));
const granted = race.filter((r) => r.data?.checkIn.result === "GRANTED").length;
check("exactly ONE device gets ACCESS GRANTED", granted === 1, `got ${granted}`);
check("the other 24 are DUPLICATE", race.filter((r) => r.data?.checkIn.reason === "DUPLICATE").length === 24);

console.log("\nAgents & role-based access");
const agentSale = await rpc("tickets.purchase", { ...buyer, typeId: "GEN", quantity: 1, method: "CARD", agentId: "AGT-004" }, "usr_agent");
check("agent sale is forced to POS and the agent's own ID", agentSale.data?.payment.method === "POS_AGENT" && agentSale.data.tickets[0].agentId === "AGT-001");
check("suspended agent cannot be credited", (await rpc("tickets.purchase", { ...buyer, typeId: "GEN", quantity: 1, method: "POS_AGENT", agentId: "AGT-006" })).ok === false);
check("check-in staff cannot refund (403)", (await rpc("payments.refund", { paymentId: agentSale.data.payment.id, reason: "nope" }, "usr_staff_01")).status === 403);
check("check-in staff cannot sell (403)", (await rpc("tickets.purchase", { ...buyer, typeId: "GEN", quantity: 1, method: "CARD" }, "usr_staff_01")).status === 403);
check("finance cannot scan (403)", (await scan(token, {}, "usr_finance")).status === 403);
check("finance can refund", (await rpc("payments.refund", { paymentId: agentSale.data.payment.id, reason: "Agent error" }, "usr_finance")).ok === true);
check("ticket agent cannot change settings (403)", (await rpc("settings.rules", { maxPerOrder: 20, requireSignedQr: false, refundsEnabled: true, salesOpen: true }, "usr_agent")).status === 403);

console.log("\nSeating");
const tbl = await rpc("tickets.purchase", { ...buyer, name: "Okoro Holdings", typeId: "RY", quantity: 1, method: "CARD", tableId: "RY-005", guests: ["A One", "B Two"] });
check("table booking on chosen table", tbl.data?.tickets[0].tableId === "RY-005" && tbl.data.tickets[0].id.startsWith("ACL-TBL-RY-"));
check("same table cannot be double-booked", (await rpc("tickets.purchase", { ...buyer, typeId: "RY", quantity: 1, method: "CARD", tableId: "RY-005" })).ok === false);
check("reserved table (RY-008) cannot be sold", (await rpc("tickets.purchase", { ...buyer, typeId: "RY", quantity: 1, method: "CARD", tableId: "RY-008" })).ok === false);
const hold = await rpc("seats.reserve", { seatIds: ["RNG-018"], note: "Sponsor" });
check("admin reserves a seat", hold.ok && hold.data[0].status === "RESERVED");
check("release reservation", (await rpc("seats.release", { seatIds: ["RNG-018"] })).ok);

s = await state();
check("every scan attempt is in the audit log", s.checkIns.length >= 194 + 40, `got ${s.checkIns.length}`);
await rpc("settings.reset");
console.log(`\n${failed ? "FAILED" : "PASSED"} — ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
