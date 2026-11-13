import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { fightInclude, hydrateFights } from "./fights";

export type EventFilters = { when?: "upcoming" | "past" | "all"; country?: string; city?: string; month?: string; type?: string };

export async function listEvents(f: EventFilters = {}) {
  const now = new Date();
  const where: Prisma.EventWhereInput = {
    ...(f.when === "past" ? { OR: [{ status: "COMPLETED" }, { startsAt: { lt: now }, status: { not: "LIVE" } }] } : {}),
    ...(f.when === "upcoming" ? { status: { in: ["SCHEDULED", "LIVE"] }, startsAt: { gte: new Date(now.getTime() - 12 * 3600e3) } } : {}),
    ...(f.country && { countryCode: f.country }),
    ...(f.city && { city: f.city }),
    ...(f.type && { type: f.type as "FIGHT_NIGHT" }),
    ...(f.month && /^\d{4}-\d{2}$/.test(f.month)
      ? { startsAt: { gte: new Date(`${f.month}-01T00:00:00Z`), lt: new Date(Date.UTC(+f.month.slice(0, 4), +f.month.slice(5), 1)) } }
      : {}),
  };
  return db.event.findMany({
    where,
    include: { country: true, parentEvent: { select: { slug: true, name: true } }, _count: { select: { fights: true } } },
    orderBy: { startsAt: f.when === "past" ? "desc" : "asc" },
  });
}

/** The event the whole site points at: a live card, else the next scheduled fight night. */
export async function getHeadlineEvent() {
  const event =
    (await db.event.findFirst({ where: { status: "LIVE", type: "FIGHT_NIGHT" }, include: { country: true } })) ??
    (await db.event.findFirst({ where: { status: "SCHEDULED", type: "FIGHT_NIGHT", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, include: { country: true } }));
  if (!event) return null;
  const fights = await hydrateFights(await db.fight.findMany({ where: { eventId: event.id, status: { not: "CANCELLED" } }, include: fightInclude, orderBy: { order: "desc" } }));
  return { ...event, fights };
}

export async function getEvent(slug: string) {
  const event = await db.event.findUnique({
    where: { slug },
    include: {
      country: true,
      parentEvent: { select: { slug: true, name: true } },
      programme: { orderBy: { startsAt: "asc" } },
      sponsors: { where: { active: true } },
      ticketTypes: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { tickets: true } } } },
      articles: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 4, include: { author: { select: { name: true, handle: true } } } },
      videos: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 8 },
      photos: { take: 12 },
      rivalries: true,
      products: { where: { active: true }, take: 4 },
    },
  });
  if (!event) return null;
  const fights = await hydrateFights(
    await db.fight.findMany({
      where: { eventId: event.id },
      include: { ...fightInclude, scorecards: true, commentary: { orderBy: { createdAt: "desc" }, take: 15 }, roundStats: true },
      orderBy: { order: "desc" },
    }),
  );
  return { ...event, fights };
}

export type EventDetail = NonNullable<Awaited<ReturnType<typeof getEvent>>>;
