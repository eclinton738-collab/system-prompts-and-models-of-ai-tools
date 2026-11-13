import "server-only";
import type { NotificationType, PointReason, Prisma } from "@prisma/client";
import { db } from "../db";
import { fanRank } from "@/lib/format";

/** Fan-point values. Tunable without touching callers. */
export const POINT_VALUES: Record<PointReason, number> = {
  SIGNUP: 100,
  WATCH_VIDEO: 10,
  ATTEND_EVENT: 250,
  PREDICT_FIGHT: 15,
  CORRECT_PREDICTION: 60,
  SHARE_CONTENT: 5,
  READ_ARTICLE: 5,
  FOLLOW_FIGHTER: 10,
  BUY_MERCH: 100,
  BUY_TICKET: 150,
  CAMPAIGN: 50,
  COMMUNITY_POST: 5,
};

/** Idempotent: the same (user, reason, refKey) only ever scores once. */
export async function awardPoints(userId: string, reason: PointReason, refKey: string, points = POINT_VALUES[reason]): Promise<boolean> {
  try {
    await db.pointEntry.create({ data: { userId, reason, refKey, points } });
    return true;
  } catch {
    return false;
  }
}

export async function getPoints(userId: string): Promise<number> {
  const r = await db.pointEntry.aggregate({ where: { userId }, _sum: { points: true } });
  return r._sum.points ?? 0;
}

async function grant(userId: string, slug: string) {
  const badge = await db.badge.findUnique({ where: { slug } });
  if (!badge) return;
  const created = await db.userBadge.createMany({ data: [{ userId, badgeId: badge.id }], skipDuplicates: true });
  if (created.count) {
    await db.notification.create({ data: { userId, type: "SYSTEM", title: `Badge unlocked: ${badge.name}`, body: badge.description, url: "/account" } });
  }
}

/** Re-evaluates badge rules for a user. Called after engagement actions. */
export async function evaluateBadges(userId: string) {
  const [views, fightsWatched, attended, tickets, user, champFollows] = await Promise.all([
    db.videoView.count({ where: { userId } }),
    db.videoView.count({ where: { userId, video: { category: "FULL_FIGHTS" } } }),
    db.ticket.count({ where: { userId, checkedInAt: { not: null } } }),
    db.ticket.findMany({ where: { userId }, select: { ticketType: { select: { section: true, name: true } } } }),
    db.user.findUnique({ where: { id: userId }, select: { premium: true } }),
    db.follow.count({ where: { userId, fighter: { titleReigns: { some: { lostAt: null } } } } }),
  ]);
  const originals = await db.videoView.count({ where: { userId, video: { seriesId: { not: null } } } });
  if (fightsWatched >= 1) await grant(userId, "first-fight");
  if (attended >= 1 || tickets.length >= 1) await grant(userId, "first-event");
  if (fightsWatched >= 100) await grant(userId, "100-fights-watched");
  if (user?.premium) await grant(userId, "vip-fan");
  if (tickets.some((t) => /ringside/i.test(`${t.ticketType.section} ${t.ticketType.name}`))) await grant(userId, "ringside");
  if (champFollows >= 3) await grant(userId, "champion-supporter");
  if (originals >= 1) await grant(userId, "acl-original");
  void views;
}

export async function getPassport(userId: string) {
  const [points, badges, follows, predictions, correct, fightsWatched, videosWatched, eventsAttended, purchases, allBadges] = await Promise.all([
    getPoints(userId),
    db.userBadge.findMany({ where: { userId }, include: { badge: true }, orderBy: { awardedAt: "desc" } }),
    db.follow.count({ where: { userId } }),
    db.prediction.count({ where: { userId } }),
    db.prediction.count({ where: { userId, correct: true } }),
    db.videoView.count({ where: { userId, video: { category: "FULL_FIGHTS" } } }),
    db.videoView.count({ where: { userId } }),
    db.ticket.count({ where: { userId, checkedInAt: { not: null } } }),
    db.order.count({ where: { userId, status: { in: ["PAID", "FULFILLED"] } } }),
    db.badge.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { points, rank: fanRank(points), badges, allBadges, follows, predictions, correct, fightsWatched, videosWatched, eventsAttended, purchases };
}

const PREF_FOR: Partial<Record<NotificationType, keyof Prisma.NotificationPreferenceUncheckedCreateInput>> = {
  FIGHT_ANNOUNCEMENT: "fightAnnouncements",
  FIGHTER_FIGHT: "fighterFights",
  EVENT_REMINDER: "eventReminders",
  RESULT: "results",
  RANKING: "rankings",
  BREAKING_NEWS: "breakingNews",
  TICKET_RELEASE: "ticketReleases",
  MERCH_DROP: "merchDrops",
  NEW_VIDEO: "newVideos",
};

/** In-app delivery honouring each user's preferences. Push/email channels attach here later. */
export async function notify(userIds: string[], n: { type: NotificationType; title: string; body: string; url?: string }): Promise<number> {
  if (!userIds.length) return 0;
  const pref = PREF_FOR[n.type];
  let targets = [...new Set(userIds)];
  if (pref) {
    const optedOut = await db.notificationPreference.findMany({ where: { userId: { in: targets }, [pref]: false }, select: { userId: true } });
    const out = new Set(optedOut.map((o) => o.userId));
    targets = targets.filter((id) => !out.has(id));
  }
  if (!targets.length) return 0;
  const res = await db.notification.createMany({ data: targets.map((userId) => ({ userId, ...n })) });
  return res.count;
}

export async function notifyFollowers(fighterIds: string[], n: { type: NotificationType; title: string; body: string; url?: string }) {
  const follows = await db.follow.findMany({ where: { fighterId: { in: fighterIds } }, select: { userId: true } });
  return notify(follows.map((f) => f.userId), n);
}

/** Marks predictions right/wrong once a result is entered and scores the correct ones. */
export async function settlePredictions(fightId: string) {
  const fight = await db.fight.findUnique({ where: { id: fightId }, select: { status: true, winnerId: true, method: true } });
  if (!fight || fight.status !== "COMPLETED") return;
  const open = await db.prediction.findMany({ where: { fightId, correct: null } });
  for (const p of open) {
    const correct = !!fight.winnerId && p.pickFighterId === fight.winnerId;
    await db.prediction.update({ where: { id: p.id }, data: { correct } });
    if (correct) await awardPoints(p.userId, "CORRECT_PREDICTION", fightId);
  }
}

export async function pointsLeaderboard(take = 25) {
  const sums = await db.pointEntry.groupBy({ by: ["userId"], _sum: { points: true }, orderBy: { _sum: { points: "desc" } }, take });
  const users = await db.user.findMany({ where: { id: { in: sums.map((s) => s.userId) } }, select: { id: true, name: true, handle: true, countryCode: true } });
  return sums.map((s, i) => {
    const points = s._sum.points ?? 0;
    return { position: i + 1, user: users.find((u) => u.id === s.userId)!, points, rank: fanRank(points).name };
  });
}

export async function predictionLeaderboard(take = 25) {
  const correct = await db.prediction.groupBy({ by: ["userId"], where: { correct: true }, _count: true, orderBy: { _count: { userId: "desc" } }, take });
  const totals = await db.prediction.groupBy({ by: ["userId"], where: { userId: { in: correct.map((c) => c.userId) }, correct: { not: null } }, _count: true });
  const users = await db.user.findMany({ where: { id: { in: correct.map((c) => c.userId) } }, select: { id: true, name: true, handle: true, countryCode: true } });
  return correct.map((c, i) => {
    const settled = totals.find((t) => t.userId === c.userId)?._count ?? c._count;
    return { position: i + 1, user: users.find((u) => u.id === c.userId)!, correct: c._count, settled, accuracy: Math.round((c._count / settled) * 100) };
  });
}
