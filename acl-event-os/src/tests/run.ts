/**
 * Critical-flow tests for ACL EVENT OS.
 *
 * Run with `npm test`. These cover the things that must never regress: the
 * seeded books must balance, and the gate must admit a ticket exactly once.
 */
import { AclStore } from "../lib/server/store";
import { EVENT_ID, ALT_EVENT_ID } from "../lib/data/seed";
import { headlineStats, breakdownByType, weekOnWeek, checkInStats } from "../lib/domain/stats";
import { TICKET_TYPE_LIST, TOTAL_ALLOCATED_SEATS, INVENTORY_CEILING } from "../lib/domain/catalog";
import { issueQrToken } from "../lib/server/qr-token";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  \x1b[31m✗ ${name}\x1b[0m ${detail}`);
  }
}

function eq(name: string, actual: unknown, expected: unknown) {
  check(name, Object.is(actual, expected), `— expected ${String(expected)}, got ${String(actual)}`);
}

function section(title: string) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

const SCAN = { gateId: "gate-main", operatorId: "usr-staff-04", deviceId: "ACL-SCN-TEST" };

async function main() {
  section("1. Seeded books balance");
  const store = new AclStore();
  const tickets = store.tickets();
  const stats = headlineStats(tickets, store.checkIns(), store.event);

  eq("327 tickets issued for Lion's Den", stats.ticketsSold, 327);
  eq("312 tickets paid", stats.paid, 312);
  eq("8 payments pending", stats.pending, 8);
  eq("5 payments failed", stats.failed, 5);
  eq("2 tickets refunded", stats.refunded, 2);
  eq("settled revenue is ₦8,730,000", stats.revenue, 8_730_000);
  eq("186 attendees checked in", stats.checkedIn, 186);
  eq("141 still to check in", stats.awaitingCheckIn, 141);
  eq("venue capacity is 500", stats.capacity, 500);
  eq("allocations fill exactly 500 seats", TOTAL_ALLOCATED_SEATS, 500);
  check(
    "projected revenue sits under the inventory ceiling",
    store.event.projectedRevenue <= INVENTORY_CEILING,
    `— target ₦${store.event.projectedRevenue.toLocaleString()} vs ceiling ₦${INVENTORY_CEILING.toLocaleString()}`,
  );
  check("check-in rate rounds to 57%", Math.round(stats.checkedInRate) === 57, `— ${stats.checkedInRate.toFixed(1)}%`);
  check("sell-through rounds to 65%", Math.round(stats.sellThrough) === 65, `— ${stats.sellThrough.toFixed(1)}%`);
  check(
    "revenue progress rounds to 60%",
    Math.round(stats.revenueProgress) === 60,
    `— ${stats.revenueProgress.toFixed(1)}%`,
  );

  const breakdown = breakdownByType(tickets);
  const sumSold = breakdown.reduce((s, b) => s + b.sold, 0);
  const sumRevenue = breakdown.reduce((s, b) => s + b.revenue, 0);
  eq("per-tier sold sums to the headline", sumSold, stats.ticketsSold);
  eq("per-tier revenue sums to the headline", sumRevenue, stats.revenue);
  check(
    "no tier oversells its allocation",
    breakdown.every((b) => b.sold <= b.allocation),
    breakdown.filter((b) => b.sold > b.allocation).map((b) => b.type).join(", "),
  );
  check(
    "every tier price matches the catalogue",
    breakdown.every((b, i) => b.price === TICKET_TYPE_LIST[i].price),
  );

  const wow = weekOnWeek(tickets);
  check("week-on-week ticket growth is positive", wow.tickets.direction === "up", `— ${wow.tickets.value.toFixed(1)}%`);
  check("week-on-week revenue growth is positive", wow.revenue.direction === "up", `— ${wow.revenue.value.toFixed(1)}%`);

  const cis = checkInStats(store.checkIns());
  eq("granted scans equal used tickets", cis.granted, stats.checkedIn);
  check("scans in the last hour are reported", cis.lastHour >= 20, `— ${cis.lastHour}`);
  check("average scan speed is under 2s", cis.averageScanMs < 2000, `— ${cis.averageScanMs.toFixed(0)}ms`);

  check(
    "cross-event tickets are excluded from event totals",
    store.allTickets().length > tickets.length &&
      tickets.every((t) => t.eventId === EVENT_ID),
  );

  section("2. Purchase → payment → ticket → QR");
  const sale = store.sell({
    fullName: "Ngozi Ibekwe",
    phone: "08031234567",
    email: "ngozi@example.com",
    type: "VIP",
    quantity: 2,
    method: "CARD",
  });
  eq("two tickets issued", sale.tickets.length, 2);
  eq("payment total is 2 × ₦25,000", sale.payment.amount, 50_000);
  eq("payment settled", sale.payment.status, "PAID");
  check("ticket IDs are minted by the server", sale.tickets.every((t) => /^ACL-VIP-\d{6}$/.test(t.id)));
  check("ticket IDs are unique", new Set(store.allTickets().map((t) => t.id)).size === store.allTickets().length);
  check("payment references its tickets", sale.payment.ticketIds.length === 2);
  const token = store.qrToken(sale.tickets[0].id);
  check("a signed QR token is issued", Boolean(token?.startsWith("ACLQR1.")));
  eq(
    "revenue moved by exactly the sale amount",
    headlineStats(store.tickets(), store.checkIns(), store.event).revenue,
    8_730_000 + 50_000,
  );

  section("3. Valid entry");
  const valid = await store.checkIn({ ...SCAN, payload: token! });
  eq("access granted", valid.result, "GRANTED");
  eq("headline reads VALID TICKET", valid.headline, "VALID TICKET");
  eq("ticket is now USED", store.ticket(sale.tickets[0].id)?.status, "USED");
  check("check-in recorded the gate", valid.checkIn?.gateName === "Main Entrance");
  check("check-in recorded the operator", valid.checkIn?.operatorName === "ACL Staff 04");
  check("check-in recorded the device", valid.checkIn?.deviceId === "ACL-SCN-TEST");
  check("scan time recorded", Boolean(valid.checkIn?.scannedAt));

  section("4. Duplicate scan is refused");
  const dup = await store.checkIn({ ...SCAN, payload: token! });
  eq("access denied", dup.result, "REJECTED");
  eq("reason is ALREADY_USED", dup.reason, "ALREADY_USED");
  eq("headline names the duplicate", dup.headline, "DUPLICATE SCAN ATTEMPT");
  check("first scan time is reported", Boolean(dup.duplicate?.firstScanAt));
  check("first scan gate is reported", dup.duplicate?.firstScanGate === "Main Entrance");
  check("first scan operator is reported", dup.duplicate?.firstScanOperator === "ACL Staff 04");
  eq("a security event was raised", dup.securityEvent?.kind, "DUPLICATE_SCAN");
  eq("the security event is critical", dup.securityEvent?.severity, "CRITICAL");
  check(
    "a critical notification was pushed",
    store.notifications.some((n) => n.kind === "SECURITY_ALERT" && n.priority === "CRITICAL"),
  );

  section("5. Unpaid, refunded, suspended, wrong event, forged");
  const pendingTicket = store.tickets().find((t) => t.paymentStatus === "PENDING")!;
  const pendingOutcome = await store.checkIn({ ...SCAN, payload: pendingTicket.id });
  eq("pending payment denied", pendingOutcome.result, "REJECTED");
  eq("reason is PAYMENT_PENDING", pendingOutcome.reason, "PAYMENT_PENDING");
  check("operator is told what to do", pendingOutcome.message.includes("payment desk"));

  const failedTicket = store.tickets().find((t) => t.paymentStatus === "FAILED")!;
  eq("failed payment denied", (await store.checkIn({ ...SCAN, payload: failedTicket.id })).reason, "PAYMENT_FAILED");

  const refundedTicket = store.tickets().find((t) => t.paymentStatus === "REFUNDED")!;
  eq("refunded ticket denied", (await store.checkIn({ ...SCAN, payload: refundedTicket.id })).reason, "TICKET_REFUNDED");

  const suspended = store.tickets().find((t) => t.status === "SUSPENDED")!;
  eq("suspended ticket denied", (await store.checkIn({ ...SCAN, payload: suspended.id })).reason, "TICKET_SUSPENDED");

  const altTicket = store.allTickets().find((t) => t.eventId === ALT_EVENT_ID)!;
  const wrongEvent = await store.checkIn({ ...SCAN, payload: altTicket.id });
  eq("wrong-event ticket denied", wrongEvent.reason, "WRONG_EVENT");
  check("the other event is named", wrongEvent.message.includes("Warrior's Gate"));

  eq(
    "unknown ticket denied",
    (await store.checkIn({ ...SCAN, payload: "ACL-VIP-009821" })).reason,
    "TICKET_NOT_FOUND",
  );
  eq(
    "junk payload denied",
    (await store.checkIn({ ...SCAN, payload: "just some text" })).reason,
    "MALFORMED_PAYLOAD",
  );

  // Re-sign a real ticket with the wrong key, exactly as a forger would.
  const forged = issueQrToken("ACL-GEN-000314", EVENT_ID, "AAAA").replace(/.$/, (c) => (c === "A" ? "B" : "A"));
  const forgedOutcome = await store.checkIn({ ...SCAN, payload: forged });
  eq("edited QR signature denied", forgedOutcome.reason, "INVALID_SIGNATURE");
  eq("forgery raises a security event", forgedOutcome.securityEvent?.kind, "FORGED_PAYLOAD");

  section("6. Manual entry");
  const manualSale = store.sell({
    fullName: "Emeka Obi", phone: "08061234567", email: "emeka@example.com",
    type: "GENERAL", quantity: 1, method: "CARD",
  });
  const manual = await store.checkIn({ ...SCAN, payload: manualSale.tickets[0].id.toLowerCase(), source: "MANUAL" });
  eq("lower-case manual entry is accepted", manual.result, "GRANTED");

  section("7. Concurrent scan — two gates, one ticket");
  const raceSale = store.sell({
    fullName: "Tunde Bakare", phone: "08099887766", email: "tunde@example.com",
    type: "GENERAL", quantity: 1, method: "CARD",
  });
  const raceId = raceSale.tickets[0].id;
  const raceToken = store.qrToken(raceId)!;
  const results = await Promise.all([
    store.checkIn({ payload: raceToken, gateId: "gate-main", operatorId: "usr-staff-04", deviceId: "ACL-SCN-01" }),
    store.checkIn({ payload: raceToken, gateId: "gate-west", operatorId: "usr-staff-07", deviceId: "ACL-SCN-02" }),
    store.checkIn({ payload: raceToken, gateId: "gate-vip", operatorId: "usr-staff-04", deviceId: "ACL-SCN-03" }),
  ]);
  const grantedCount = results.filter((r) => r.result === "GRANTED").length;
  eq("exactly one scanner gets ACCESS GRANTED", grantedCount, 1);
  eq("the other two are refused as duplicates", results.filter((r) => r.reason === "ALREADY_USED").length, 2);
  eq("the ticket is used exactly once", store.ticket(raceId)?.status, "USED");

  // Hammer it: 25 simultaneous scans of one fresh ticket.
  const stressSale = store.sell({
    fullName: "Aisha Sanusi", phone: "08123456789", email: "aisha@example.com",
    type: "GENERAL", quantity: 1, method: "CARD",
  });
  const stressToken = store.qrToken(stressSale.tickets[0].id)!;
  const stress = await Promise.all(
    Array.from({ length: 25 }, (_, i) =>
      store.checkIn({ payload: stressToken, gateId: "gate-main", operatorId: "usr-staff-04", deviceId: `ACL-SCN-${i}` }),
    ),
  );
  eq("25 simultaneous scans admit exactly one", stress.filter((r) => r.result === "GRANTED").length, 1);
  eq(
    "one GRANTED check-in row exists for that ticket",
    store.checkIns().filter((c) => c.ticketId === stressSale.tickets[0].id && c.result === "GRANTED").length,
    1,
  );

  section("8. Refunds and inventory");
  const refundSale = store.sell({
    fullName: "Grace Opara", phone: "08033334444", email: "grace@example.com",
    type: "VVIP", quantity: 1, method: "CARD",
  });
  const beforeRefund = headlineStats(store.tickets(), store.checkIns(), store.event).revenue;
  store.refund(refundSale.tickets[0].id, "Customer requested cancellation", "Clinton Edward");
  const afterRefund = headlineStats(store.tickets(), store.checkIns(), store.event).revenue;
  eq("refund removes the ticket value from revenue", beforeRefund - afterRefund, 50_000);
  eq("refunded ticket denied at the gate", (await store.checkIn({ ...SCAN, payload: refundSale.tickets[0].id })).reason, "TICKET_REFUNDED");

  let refundOfUsedRejected = false;
  try {
    store.refund(raceId, "test", "Clinton Edward");
  } catch {
    refundOfUsedRejected = true;
  }
  check("a used ticket cannot be refunded at the desk", refundOfUsedRejected);

  let oversellRejected = false;
  try {
    store.sell({
      fullName: "Over Sell", phone: "08000000000", email: "over@example.com",
      type: "ROYAL", quantity: 99, method: "CARD",
    });
  } catch {
    oversellRejected = true;
  }
  check("inventory cannot be oversold", oversellRejected);

  section("9. Audit trail");
  const audit = store.checkIns();
  check("every scan is logged", audit.length > stats.checkedIn);
  check(
    "every scan carries ticket, time, gate, operator and device",
    audit.every((c) => c.ticketId && c.scannedAt && c.gateId && c.operatorId && c.deviceId),
  );
  check(
    "every rejection carries a reason",
    audit.filter((c) => c.result === "REJECTED").every((c) => Boolean(c.reason)),
  );

  console.log(
    `\n\x1b[1m${failed === 0 ? "\x1b[32mALL PASS" : "\x1b[31mFAILURES"}\x1b[0m  ${passed} passed, ${failed} failed\n`,
  );
  if (failed) {
    console.log(failures.map((f) => `  - ${f}`).join("\n"));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
