import { z } from "zod";
import { route } from "@/server/api";
import { db } from "@/server/db";

const b = z.boolean();
const body = z.object({ fightAnnouncements: b, fighterFights: b, eventReminders: b, results: b, rankings: b, breakingNews: b, ticketReleases: b, merchDrops: b, newVideos: b, emailChannel: b });
export const GET = route({ auth: true }, async ({ user }) => db.notificationPreference.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } }));
export const PUT = route({ auth: true, body }, async ({ user, body }) => db.notificationPreference.upsert({ where: { userId: user.id }, update: body, create: { userId: user.id, ...body } }));
