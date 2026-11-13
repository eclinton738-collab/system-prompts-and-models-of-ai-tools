import "server-only";
import type { Permission } from "../permissions";
import { db } from "../db";
import { hashPassword } from "../auth";
import { ApiError } from "../api";
import { notify, notifyFollowers, settlePredictions } from "../services/engagement";
import { slugify } from "@/lib/format";
import { ARTICLE_CATEGORIES, VIDEO_CATEGORIES } from "@/lib/content";
import { FIGHT_STYLES, GYM_DISCIPLINES } from "@/lib/site";

/**
 * CMS resource registry. Each entry describes one admin-managed entity: its fields,
 * list columns, permission and save hooks. The generic admin pages and the
 * /api/v1/admin/[resource] routes are driven entirely by this file — adding a field
 * or a whole new content type means editing configuration, not building screens.
 */
export type FieldType = "text" | "textarea" | "number" | "boolean" | "select" | "relation" | "multirelation" | "datetime" | "date" | "list" | "multiselect" | "password";
export type AdminField = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: readonly string[];
  relation?: string; // resource key
  half?: boolean;
  help?: string;
  int?: boolean;
  createOnly?: boolean;
};
type Row = Record<string, unknown> & { id?: string };
type Ctx = { userId: string; role: string; isCreate: boolean; before: Row | null };
export type AdminResource = {
  key: string;
  model: string;
  label: string;
  singular: string;
  permission: Permission;
  idField?: string; // default "id"
  fields: AdminField[];
  columns: [string, string][];
  search?: string[];
  orderBy: Record<string, "asc" | "desc"> | Record<string, unknown>[];
  /** Human label for list rows, relation pickers and audit entries. */
  title: (row: Row) => string;
  /** Extra relations to load so `title`/columns can read them. */
  include?: Record<string, unknown>;
  /** Field that receives an auto-generated slug from this source when left blank. */
  slugFrom?: (data: Row) => string;
  beforeSave?: (data: Row, ctx: Ctx) => Promise<void> | void;
  afterSave?: (row: Row, ctx: Ctx) => Promise<void> | void;
  publicPath?: (row: Row) => string | null;
  noCreate?: boolean;
  noDelete?: boolean;
};

const s = (v: unknown) => (v == null ? "" : String(v));
const name = (f: unknown) => {
  const x = f as { firstName?: string; lastName?: string } | null;
  return x ? `${x.firstName} ${x.lastName}` : "—";
};
const METHODS = ["KO", "TKO", "UD", "SD", "MD", "DRAW", "RTD", "DQ", "NC"] as const;

const list: AdminResource[] = [
  {
    key: "fighters", model: "fighter", label: "Fighters", singular: "fighter", permission: "fighters.manage", orderBy: { lastName: "asc" }, search: ["firstName", "lastName", "nickname"],
    title: (r) => `${r.firstName} ${r.lastName}`, include: { division: true, country: true }, slugFrom: (d) => `${d.firstName} ${d.lastName}`, publicPath: (r) => `/fighters/${r.slug}`,
    columns: [["lastName", "Last name"], ["firstName", "First name"], ["division.name", "Division"], ["country.name", "Country"], ["status", "Status"]],
    fields: [
      { name: "firstName", label: "First name", type: "text", required: true, half: true }, { name: "lastName", label: "Last name", type: "text", required: true, half: true },
      { name: "nickname", label: "Nickname", type: "text", half: true }, { name: "slug", label: "URL slug", type: "text", half: true, help: "Leave blank to generate from the name." },
      { name: "gender", label: "Gender", type: "select", options: ["MEN", "WOMEN"], required: true, half: true }, { name: "dateOfBirth", label: "Date of birth", type: "date", required: true, half: true },
      { name: "countryCode", label: "Country", type: "relation", relation: "countries", required: true, half: true }, { name: "state", label: "State / region", type: "text", half: true }, { name: "city", label: "City", type: "text", half: true },
      { name: "divisionId", label: "Division", type: "relation", relation: "divisions", required: true, half: true }, { name: "gymId", label: "Gym", type: "relation", relation: "gyms", half: true }, { name: "coachId", label: "Coach", type: "relation", relation: "coaches", half: true },
      { name: "heightCm", label: "Height (cm)", type: "number", int: true, required: true, half: true }, { name: "reachCm", label: "Reach (cm)", type: "number", int: true, required: true, half: true },
      { name: "stance", label: "Stance", type: "select", options: ["ORTHODOX", "SOUTHPAW", "SWITCH"], required: true, half: true }, { name: "style", label: "Fighting style", type: "select", options: FIGHT_STYLES, required: true, half: true },
      { name: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE", "RETIRED"], required: true, half: true }, { name: "featured", label: "Featured star", type: "boolean", half: true },
      { name: "priorWins", label: "Pre-ACL wins", type: "number", int: true, half: true, help: "ACL bouts are counted automatically from results." }, { name: "priorLosses", label: "Pre-ACL losses", type: "number", int: true, half: true },
      { name: "priorDraws", label: "Pre-ACL draws", type: "number", int: true, half: true }, { name: "priorKos", label: "Pre-ACL KOs", type: "number", int: true, half: true }, { name: "proDebut", label: "Pro debut", type: "date", half: true },
      { name: "bio", label: "Short biography", type: "textarea", required: true }, { name: "story", label: "Full story", type: "textarea" }, { name: "quote", label: "Signature quote", type: "text" },
      { name: "photoUrl", label: "Photo URL", type: "text", help: "Object-storage/CDN URL. Generated artwork is used when empty." },
      { name: "instagram", label: "Instagram handle", type: "text", half: true }, { name: "xHandle", label: "X handle", type: "text", half: true }, { name: "tiktok", label: "TikTok handle", type: "text", half: true },
    ],
  },
  {
    key: "fights", model: "fight", label: "Fights", singular: "fight", permission: "fights.manage", orderBy: [{ event: { startsAt: "desc" } }, { order: "desc" }],
    include: { fighterA: true, fighterB: true, event: true, division: true }, title: (r) => `${(r.fighterA as Row)?.lastName ?? "?"} vs ${(r.fighterB as Row)?.lastName ?? "?"}`, publicPath: (r) => `/fights/${r.slug}`,
    columns: [["@title", "Fight"], ["event.name", "Event"], ["division.name", "Division"], ["position", "Card"], ["status", "Status"]],
    fields: [
      { name: "eventId", label: "Event", type: "relation", relation: "events", required: true }, { name: "fighterAId", label: "Fighter A", type: "relation", relation: "fighters", required: true, half: true }, { name: "fighterBId", label: "Fighter B", type: "relation", relation: "fighters", required: true, half: true },
      { name: "divisionId", label: "Weight class", type: "relation", relation: "divisions", required: true, half: true }, { name: "fightType", label: "Fight type", type: "text", half: true, help: "e.g. Professional boxing, ACL Championship, Title eliminator" },
      { name: "rounds", label: "Rounds", type: "number", int: true, required: true, half: true }, { name: "roundMinutes", label: "Minutes per round", type: "number", int: true, half: true },
      { name: "position", label: "Card position", type: "select", options: ["MAIN_EVENT", "CO_MAIN", "UNDERCARD"], required: true, half: true }, { name: "order", label: "Bout order", type: "number", int: true, half: true, help: "Higher = later in the night." },
      { name: "isTitleFight", label: "Title fight", type: "boolean", half: true }, { name: "status", label: "Status", type: "select", options: ["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"], required: true, half: true },
      { name: "winnerId", label: "Winner", type: "relation", relation: "fighters", half: true, help: "Leave empty for a draw or no contest." }, { name: "method", label: "Method", type: "select", options: METHODS, half: true },
      { name: "endRound", label: "Round ended", type: "number", int: true, half: true }, { name: "endTime", label: "Time (m:ss)", type: "text", half: true }, { name: "performanceBonus", label: "Performance bonus (winner)", type: "boolean", half: true },
      { name: "slug", label: "URL slug", type: "text", half: true, help: "Leave blank to generate." },
    ],
    beforeSave: async (d, ctx) => {
      if (d.fighterAId && d.fighterAId === d.fighterBId) throw new ApiError(422, "validation", "A fighter cannot fight themselves.", { fighterBId: "Choose a different opponent" });
      if (d.winnerId && ![d.fighterAId ?? ctx.before?.fighterAId, d.fighterBId ?? ctx.before?.fighterBId].includes(d.winnerId)) throw new ApiError(422, "validation", "Winner must be one of the two fighters.", { winnerId: "Must be Fighter A or Fighter B" });
      if (d.status === "COMPLETED" && !d.method) throw new ApiError(422, "validation", "A completed fight needs a result method.", { method: "Required for completed fights" });
      if (!d.slug && ctx.isCreate) {
        const [a, b] = await Promise.all([db.fighter.findUnique({ where: { id: s(d.fighterAId) } }), db.fighter.findUnique({ where: { id: s(d.fighterBId) } })]);
        let slug = slugify(`${a?.lastName}-vs-${b?.lastName}`);
        const n = await db.fight.count({ where: { slug: { startsWith: slug } } });
        if (n) slug = `${slug}-${n + 1}`;
        d.slug = slug;
      }
    },
    afterSave: async (row, ctx) => {
      const f = await db.fight.findUniqueOrThrow({ where: { id: s(row.id) }, include: { fighterA: true, fighterB: true, event: true } });
      const title = `${f.fighterA.lastName} vs ${f.fighterB.lastName}`;
      if (ctx.isCreate && f.status === "SCHEDULED") await notifyFollowers([f.fighterAId, f.fighterBId], { type: "FIGHTER_FIGHT", title: `${title} is official`, body: `${f.event.name} — predictions are open.`, url: `/fights/${f.slug}` });
      if (f.status === "COMPLETED" && ctx.before?.status !== "COMPLETED") await finaliseFight(f.id);
    },
  },
  {
    key: "events", model: "event", label: "Events", singular: "event", permission: "events.manage", orderBy: { startsAt: "desc" }, search: ["name", "city", "venue"], title: (r) => s(r.name), slugFrom: (d) => s(d.name), publicPath: (r) => `/events/${r.slug}`,
    columns: [["name", "Event"], ["type", "Type"], ["startsAt", "Date"], ["city", "City"], ["status", "Status"]],
    fields: [
      { name: "name", label: "Event name", type: "text", required: true }, { name: "number", label: "Event number", type: "text", half: true }, { name: "tagline", label: "Tagline", type: "text", half: true },
      { name: "type", label: "Event type", type: "select", options: ["FIGHT_NIGHT", "WEIGH_IN", "PRESS_CONFERENCE", "OPEN_WORKOUT", "FAN_EVENT"], required: true, half: true }, { name: "parentEventId", label: "Part of fight night", type: "relation", relation: "events", half: true, help: "For weigh-ins, pressers and fan events." },
      { name: "startsAt", label: "Date & time", type: "datetime", required: true, half: true, help: "Entered in your local time." }, { name: "status", label: "Status", type: "select", options: ["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"], required: true, half: true },
      { name: "venue", label: "Venue", type: "text", required: true, half: true }, { name: "city", label: "City", type: "text", required: true, half: true }, { name: "state", label: "State / region", type: "text", half: true }, { name: "countryCode", label: "Country", type: "relation", relation: "countries", required: true, half: true },
      { name: "description", label: "Description", type: "textarea", required: true }, { name: "venueInfo", label: "Venue information", type: "textarea" }, { name: "broadcast", label: "How to watch", type: "text" },
      { name: "posterUrl", label: "Poster URL", type: "text", half: true }, { name: "ticketUrl", label: "External ticket URL", type: "text", half: true, help: "Optional. ACL ticketing is used by default." },
      { name: "sideA", label: "State Wars side A", type: "text", half: true, help: "e.g. ABIA" }, { name: "sideB", label: "State Wars side B", type: "text", half: true },
      { name: "sponsors", label: "Sponsors", type: "multirelation", relation: "sponsors" }, { name: "slug", label: "URL slug", type: "text", half: true, help: "Leave blank to generate." },
    ],
    afterSave: async (row, ctx) => {
      if (ctx.isCreate && row.type === "FIGHT_NIGHT") {
        const users = await db.user.findMany({ where: { disabled: false, role: "FAN" }, select: { id: true } });
        await notify(users.map((u) => u.id), { type: "FIGHT_ANNOUNCEMENT", title: `Announced: ${row.name}`, body: `${row.venue}, ${row.city}.`, url: `/events/${row.slug}` });
      }
    },
  },
  {
    key: "divisions", model: "division", label: "Divisions", singular: "division", permission: "rankings.manage", orderBy: { sortOrder: "asc" }, title: (r) => s(r.name), slugFrom: (d) => s(d.name), publicPath: (r) => `/rankings?division=${r.slug}`,
    columns: [["name", "Division"], ["gender", "Gender"], ["limitLbs", "Limit (lbs)"], ["sortOrder", "Order"], ["active", "Active"]],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, half: true }, { name: "slug", label: "URL slug", type: "text", half: true }, { name: "gender", label: "Gender", type: "select", options: ["MEN", "WOMEN"], required: true, half: true },
      { name: "limitLbs", label: "Weight limit (lbs)", type: "number", half: true }, { name: "limitKg", label: "Weight limit (kg)", type: "number", half: true }, { name: "sortOrder", label: "Display order", type: "number", int: true, half: true },
      { name: "active", label: "Active (deactivate to hide from the site)", type: "boolean" },
    ],
  },
  {
    key: "rankings", model: "ranking", label: "Rankings", singular: "ranking", permission: "rankings.manage", orderBy: [{ division: { sortOrder: "asc" } }, { rank: "asc" }], include: { fighter: true, division: true }, title: (r) => `#${r.rank} ${name(r.fighter)}`,
    columns: [["division.name", "Division"], ["rank", "Rank"], ["@fighter", "Fighter"], ["previousRank", "Previous"]],
    fields: [
      { name: "divisionId", label: "Division", type: "relation", relation: "divisions", required: true, half: true }, { name: "fighterId", label: "Fighter", type: "relation", relation: "fighters", required: true, half: true },
      { name: "rank", label: "Rank", type: "number", int: true, required: true, half: true, help: "1 = number-one contender. The champion is set under Champions." }, { name: "previousRank", label: "Previous rank", type: "number", int: true, half: true, help: "Drives the movement arrow. Empty = new entry." },
    ],
    beforeSave: (d) => {
      if (d.rank != null && (Number(d.rank) < 1 || Number(d.rank) > 15)) throw new ApiError(422, "validation", "Rank must be between 1 and 15.", { rank: "1–15" });
    },
    afterSave: async (row, ctx) => {
      if (ctx.before && ctx.before.rank !== row.rank) {
        const f = await db.fighter.findUnique({ where: { id: s(row.fighterId) }, include: { division: true } });
        if (f) await notifyFollowers([f.id], { type: "RANKING", title: `${f.lastName} is now #${row.rank}`, body: `ACL ${f.division.name} rankings have been updated.`, url: `/rankings?division=${f.division.slug}` });
      }
    },
  },
  {
    key: "champions", model: "titleReign", label: "Champions", singular: "title reign", permission: "rankings.manage", orderBy: { wonAt: "desc" }, include: { fighter: true, division: true }, title: (r) => `${(r.division as Row)?.name} — ${name(r.fighter)}`,
    columns: [["division.name", "Division"], ["@fighter", "Champion"], ["wonAt", "Won"], ["lostAt", "Lost"], ["note", "Note"]],
    fields: [
      { name: "divisionId", label: "Division", type: "relation", relation: "divisions", required: true, half: true }, { name: "fighterId", label: "Champion", type: "relation", relation: "fighters", required: true, half: true },
      { name: "wonAt", label: "Won on", type: "date", required: true, half: true }, { name: "lostAt", label: "Lost on", type: "date", half: true, help: "Empty = reigning champion." }, { name: "wonFightId", label: "Won in fight", type: "relation", relation: "fights", half: true }, { name: "note", label: "Note", type: "text", half: true },
    ],
    beforeSave: async (d, ctx) => {
      if (!d.lostAt) {
        const other = await db.titleReign.findFirst({ where: { divisionId: s(d.divisionId ?? ctx.before?.divisionId), lostAt: null, NOT: { id: s(ctx.before?.id) || "-" } } });
        if (other) throw new ApiError(409, "conflict", "This division already has a reigning champion. End that reign first.", { divisionId: "Division already has a champion" });
      }
    },
  },
  {
    key: "news", model: "article", label: "News", singular: "article", permission: "content.manage", orderBy: { publishedAt: "desc" }, search: ["title", "excerpt"], include: { author: true }, title: (r) => s(r.title), slugFrom: (d) => s(d.title), publicPath: (r) => (r.status === "PUBLISHED" ? `/news/${r.slug}` : null),
    columns: [["title", "Headline"], ["category", "Category"], ["author.name", "Author"], ["publishedAt", "Published"], ["status", "Status"]],
    fields: [
      { name: "title", label: "Headline", type: "text", required: true }, { name: "excerpt", label: "Standfirst", type: "textarea", required: true }, { name: "body", label: "Body", type: "textarea", required: true, help: "Separate paragraphs with a blank line." },
      { name: "category", label: "Category", type: "select", options: ARTICLE_CATEGORIES, required: true, half: true }, { name: "status", label: "Status", type: "select", options: ["DRAFT", "PUBLISHED"], required: true, half: true },
      { name: "authorId", label: "Author", type: "relation", relation: "users", required: true, half: true }, { name: "publishedAt", label: "Publish date", type: "datetime", half: true }, { name: "featured", label: "Featured", type: "boolean", half: true },
      { name: "eventId", label: "Related event", type: "relation", relation: "events", half: true }, { name: "fighters", label: "Fighters in this story", type: "multirelation", relation: "fighters" }, { name: "tags", label: "Tags", type: "multirelation", relation: "tags" },
      { name: "coverUrl", label: "Cover image URL", type: "text", half: true }, { name: "slug", label: "URL slug", type: "text", half: true },
    ],
    afterSave: async (row, ctx) => {
      if (row.status === "PUBLISHED" && row.category === "BREAKING_NEWS" && (ctx.isCreate || ctx.before?.status !== "PUBLISHED")) {
        const users = await db.user.findMany({ where: { disabled: false }, select: { id: true } });
        await notify(users.map((u) => u.id), { type: "BREAKING_NEWS", title: s(row.title), body: s(row.excerpt).slice(0, 140), url: `/news/${row.slug}` });
      }
    },
  },
  {
    key: "videos", model: "video", label: "Videos", singular: "video", permission: "content.manage", orderBy: { publishedAt: "desc" }, search: ["title"], title: (r) => s(r.title), slugFrom: (d) => s(d.title), publicPath: (r) => (r.status === "PUBLISHED" ? `/watch/${r.slug}` : null),
    columns: [["title", "Title"], ["category", "Category"], ["durationSec", "Seconds"], ["premium", "Premium"], ["status", "Status"]],
    fields: [
      { name: "title", label: "Title", type: "text", required: true }, { name: "description", label: "Description", type: "textarea", required: true },
      { name: "category", label: "Category", type: "select", options: VIDEO_CATEGORIES, required: true, half: true }, { name: "durationSec", label: "Duration (seconds)", type: "number", int: true, required: true, half: true },
      { name: "sourceUrl", label: "Stream URL (HLS/MP4)", type: "text", help: "From the video CDN. The player shows once this is set." }, { name: "thumbnailUrl", label: "Thumbnail URL", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["DRAFT", "PUBLISHED"], required: true, half: true }, { name: "premium", label: "Premium (members only)", type: "boolean", half: true }, { name: "publishedAt", label: "Publish date", type: "datetime", half: true },
      { name: "eventId", label: "Event", type: "relation", relation: "events", half: true }, { name: "fightId", label: "Fight", type: "relation", relation: "fights", half: true }, { name: "seriesId", label: "Originals series", type: "relation", relation: "series", half: true }, { name: "episode", label: "Episode", type: "number", int: true, half: true },
      { name: "fighters", label: "Fighter tags", type: "multirelation", relation: "fighters" }, { name: "slug", label: "URL slug", type: "text", half: true },
    ],
    afterSave: async (row, ctx) => {
      if (row.status === "PUBLISHED" && ctx.isCreate) {
        const v = await db.video.findUnique({ where: { id: s(row.id) }, select: { fighters: { select: { id: true } } } });
        if (v?.fighters.length) await notifyFollowers(v.fighters.map((f) => f.id), { type: "NEW_VIDEO", title: `New video: ${row.title}`, body: "Now on ACL Watch.", url: `/watch/${row.slug}` });
      }
    },
  },
  {
    key: "series", model: "series", label: "Originals series", singular: "series", permission: "content.manage", orderBy: { sortOrder: "asc" }, title: (r) => s(r.title), slugFrom: (d) => s(d.title), publicPath: () => "/originals",
    columns: [["title", "Series"], ["kind", "Kind"], ["sortOrder", "Order"]],
    fields: [{ name: "title", label: "Title", type: "text", required: true, half: true }, { name: "kind", label: "Kind", type: "select", options: ["ACL Original", "Fighter documentary", "Rivalry documentary", "Event documentary", "Gym story", "African boxing story"], required: true, half: true }, { name: "description", label: "Description", type: "textarea", required: true }, { name: "sortOrder", label: "Order", type: "number", int: true, half: true }, { name: "slug", label: "URL slug", type: "text", half: true }],
  },
  {
    key: "photos", model: "photo", label: "Photos", singular: "photo", permission: "content.manage", orderBy: { createdAt: "desc" }, search: ["caption"], title: (r) => s(r.caption),
    columns: [["caption", "Caption"], ["credit", "Credit"], ["createdAt", "Added"]],
    fields: [{ name: "url", label: "Image URL", type: "text", required: true, help: "Upload to object storage, then paste the CDN URL (https only)." }, { name: "caption", label: "Caption", type: "text", required: true }, { name: "credit", label: "Credit", type: "text", half: true }, { name: "eventId", label: "Event", type: "relation", relation: "events", half: true }, { name: "fighterId", label: "Fighter", type: "relation", relation: "fighters", half: true }, { name: "gymId", label: "Gym", type: "relation", relation: "gyms", half: true }],
    beforeSave: (d) => {
      if (d.url && !/^https:\/\//i.test(s(d.url))) throw new ApiError(422, "validation", "Image URLs must be https.", { url: "Must start with https://" });
    },
  },
  {
    key: "tickets", model: "ticketType", label: "Tickets", singular: "ticket category", permission: "commerce.manage", orderBy: [{ event: { startsAt: "desc" } }, { sortOrder: "asc" }], include: { event: true, _count: { select: { tickets: true } } }, title: (r) => `${(r.event as Row)?.name} — ${r.name}`,
    columns: [["event.name", "Event"], ["name", "Category"], ["section", "Section"], ["priceMinor", "Price (minor)"], ["currency", "Cur."], ["_count.tickets", "Sold"], ["capacity", "Capacity"], ["salesOpen", "On sale"]],
    fields: [{ name: "eventId", label: "Event", type: "relation", relation: "events", required: true }, { name: "name", label: "Category name", type: "text", required: true, half: true }, { name: "section", label: "Seat section", type: "text", required: true, half: true }, { name: "description", label: "Description", type: "text" }, { name: "priceMinor", label: "Price in minor units", type: "number", int: true, required: true, half: true, help: "e.g. 500000 = ₦5,000.00" }, { name: "currency", label: "Currency", type: "relation", relation: "currencies", required: true, half: true }, { name: "capacity", label: "Capacity", type: "number", int: true, required: true, half: true }, { name: "sortOrder", label: "Order", type: "number", int: true, half: true }, { name: "salesOpen", label: "On sale", type: "boolean" }],
    afterSave: async (row, ctx) => {
      if (row.salesOpen && (ctx.isCreate || ctx.before?.salesOpen === false)) {
        const ev = await db.event.findUnique({ where: { id: s(row.eventId) }, include: { favorites: { select: { userId: true } } } });
        if (ev) await notify(ev.favorites.map((f) => f.userId), { type: "TICKET_RELEASE", title: `Tickets on sale: ${ev.name}`, body: `${row.name} now available.`, url: `/events/${ev.slug}/tickets` });
      }
    },
  },
  {
    key: "shop", model: "product", label: "Shop", singular: "product", permission: "commerce.manage", orderBy: { name: "asc" }, search: ["name"], title: (r) => s(r.name), slugFrom: (d) => s(d.name), publicPath: (r) => (r.active ? `/shop/${r.slug}` : null),
    columns: [["name", "Product"], ["category", "Category"], ["priceMinor", "Price (minor)"], ["currency", "Cur."], ["inventory", "Stock"], ["active", "Active"]],
    fields: [{ name: "name", label: "Name", type: "text", required: true }, { name: "description", label: "Description", type: "textarea", required: true }, { name: "category", label: "Category", type: "select", options: ["SHIRTS", "HOODIES", "CAPS", "FIGHTER", "EVENT", "CHAMPIONSHIP", "GYM", "LIMITED"], required: true, half: true }, { name: "priceMinor", label: "Price in minor units", type: "number", int: true, required: true, half: true }, { name: "currency", label: "Currency", type: "relation", relation: "currencies", required: true, half: true }, { name: "inventory", label: "Inventory", type: "number", int: true, required: true, half: true }, { name: "sizes", label: "Sizes", type: "list", help: "One per line. Leave empty for one-size items." }, { name: "limited", label: "Limited edition", type: "boolean", half: true }, { name: "active", label: "Active", type: "boolean", half: true }, { name: "fighterId", label: "Fighter merchandise for", type: "relation", relation: "fighters", half: true }, { name: "eventId", label: "Event merchandise for", type: "relation", relation: "events", half: true }, { name: "imageUrl", label: "Image URL", type: "text" }, { name: "slug", label: "URL slug", type: "text", half: true }],
  },
  {
    key: "promo-codes", model: "promoCode", idField: "code", label: "Promo codes", singular: "promo code", permission: "commerce.manage", orderBy: { code: "asc" }, title: (r) => s(r.code),
    columns: [["code", "Code"], ["percentOff", "% off"], ["uses", "Uses"], ["maxUses", "Max uses"], ["active", "Active"]],
    fields: [{ name: "code", label: "Code", type: "text", required: true, half: true, createOnly: true }, { name: "percentOff", label: "Percent off", type: "number", int: true, required: true, half: true }, { name: "maxUses", label: "Maximum uses", type: "number", int: true, half: true }, { name: "expiresAt", label: "Expires", type: "datetime", half: true }, { name: "active", label: "Active", type: "boolean" }],
    beforeSave: (d) => {
      if (d.code) d.code = s(d.code).trim().toUpperCase();
      if (d.percentOff != null && (Number(d.percentOff) < 1 || Number(d.percentOff) > 100)) throw new ApiError(422, "validation", "Discount must be 1–100%.", { percentOff: "1–100" });
    },
  },
  {
    key: "users", model: "user", label: "Users", singular: "user", permission: "users.manage", orderBy: { createdAt: "desc" }, search: ["name", "email", "handle"], title: (r) => `${r.name} (${r.email})`, noDelete: true,
    columns: [["name", "Name"], ["email", "Email"], ["role", "Role"], ["countryCode", "Country"], ["disabled", "Disabled"], ["createdAt", "Joined"]],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, half: true }, { name: "email", label: "Email", type: "text", required: true, half: true }, { name: "handle", label: "Handle", type: "text", required: true, half: true },
      { name: "role", label: "Role", type: "select", options: ["FAN", "FIGHTER", "COACH", "JOURNALIST", "MEDIA_PARTNER", "SPONSOR", "SCOUT", "EDITOR", "EVENT_MANAGER", "ADMIN", "SUPER_ADMIN"], required: true, half: true },
      { name: "password", label: "Password", type: "password", half: true, help: "Set on creation, or enter a new one to reset. Minimum 10 characters." }, { name: "fighterId", label: "Linked fighter profile", type: "relation", relation: "fighters", half: true, help: "For FIGHTER accounts: unlocks the fighter portal." },
      { name: "countryCode", label: "Country", type: "relation", relation: "countries", half: true }, { name: "city", label: "City", type: "text", half: true }, { name: "bio", label: "Bio (shown on author pages)", type: "textarea" },
      { name: "premium", label: "Premium member", type: "boolean", half: true }, { name: "disabled", label: "Disabled (cannot sign in)", type: "boolean", half: true },
    ],
    beforeSave: async (d, ctx) => {
      const elevated = ["ADMIN", "SUPER_ADMIN"];
      const touchesElevated = elevated.includes(s(d.role)) || elevated.includes(s(ctx.before?.role));
      if (touchesElevated && ctx.role !== "SUPER_ADMIN" && (ctx.isCreate || d.role !== ctx.before?.role || d.password)) throw new ApiError(403, "forbidden", "Only a super admin can create, change or reset admin accounts.", { role: "Super admin only" });
      if (ctx.before?.id === ctx.userId && (d.disabled || (d.role && d.role !== ctx.before.role))) throw new ApiError(422, "validation", "You cannot change your own role or disable yourself.");
      if (d.email) d.email = s(d.email).trim().toLowerCase();
      const pw = s(d.password);
      delete d.password;
      if (pw) {
        if (pw.length < 10) throw new ApiError(422, "validation", "Password too short.", { password: "At least 10 characters" });
        d.passwordHash = await hashPassword(pw);
      } else if (ctx.isCreate) throw new ApiError(422, "validation", "Set a password for the new account.", { password: "Required" });
    },
    afterSave: async (row, ctx) => {
      // Role change, password reset or disabling revokes existing sessions.
      if (ctx.before && (row.disabled || row.role !== ctx.before.role || row.passwordHash !== ctx.before.passwordHash) && row.id !== ctx.userId) await db.session.deleteMany({ where: { userId: s(row.id) } });
      if (ctx.isCreate) await db.notificationPreference.upsert({ where: { userId: s(row.id) }, update: {}, create: { userId: s(row.id) } });
    },
  },
  {
    key: "sponsors", model: "sponsor", label: "Sponsors", singular: "sponsor", permission: "sponsors.manage", orderBy: { name: "asc" }, title: (r) => s(r.name), slugFrom: (d) => s(d.name), publicPath: () => "/partners",
    columns: [["name", "Sponsor"], ["tier", "Tier"], ["website", "Website"], ["active", "Active"]],
    fields: [{ name: "name", label: "Name", type: "text", required: true, half: true }, { name: "tier", label: "Tier", type: "select", options: ["TITLE", "PREMIER", "OFFICIAL", "SUPPORTING"], required: true, half: true }, { name: "description", label: "Description", type: "textarea" }, { name: "website", label: "Website", type: "text", half: true }, { name: "logoUrl", label: "Logo URL", type: "text", half: true }, { name: "active", label: "Active", type: "boolean", half: true }, { name: "slug", label: "URL slug", type: "text", half: true }],
  },
  {
    key: "sponsor-inquiries", model: "sponsorInquiry", label: "Sponsor inquiries", singular: "inquiry", permission: "sponsors.manage", orderBy: { createdAt: "desc" }, title: (r) => `${r.company} — ${r.name}`, noCreate: true,
    columns: [["company", "Company"], ["name", "Contact"], ["email", "Email"], ["budget", "Budget"], ["status", "Status"], ["createdAt", "Received"]],
    fields: [{ name: "status", label: "Status", type: "select", options: ["NEW", "CONTACTED", "CLOSED"], required: true, half: true }, { name: "company", label: "Company", type: "text", half: true }, { name: "name", label: "Contact", type: "text", half: true }, { name: "email", label: "Email", type: "text", half: true }, { name: "phone", label: "Phone", type: "text", half: true }, { name: "country", label: "Country", type: "text", half: true }, { name: "budget", label: "Budget", type: "text", half: true }, { name: "interests", label: "Interests", type: "list" }, { name: "message", label: "Message", type: "textarea" }],
  },
  {
    key: "messages", model: "contactMessage", label: "Contact messages", singular: "message", permission: "users.manage", orderBy: { createdAt: "desc" }, title: (r) => `${r.topic} — ${r.name}`, noCreate: true,
    columns: [["topic", "Topic"], ["name", "From"], ["email", "Email"], ["status", "Status"], ["createdAt", "Received"]],
    fields: [{ name: "status", label: "Status", type: "select", options: ["NEW", "CONTACTED", "CLOSED"], required: true, half: true }, { name: "topic", label: "Topic", type: "text", half: true }, { name: "name", label: "Name", type: "text", half: true }, { name: "email", label: "Email", type: "text", half: true }, { name: "message", label: "Message", type: "textarea" }],
  },
  {
    key: "gyms", model: "gym", label: "Gyms", singular: "gym", permission: "gyms.manage", orderBy: { name: "asc" }, search: ["name", "city"], include: { country: true }, title: (r) => s(r.name), slugFrom: (d) => s(d.name), publicPath: (r) => `/gyms/${r.slug}`,
    columns: [["name", "Gym"], ["city", "City"], ["country.name", "Country"], ["aclAffiliated", "Affiliated"]],
    fields: [{ name: "name", label: "Name", type: "text", required: true, half: true }, { name: "slug", label: "URL slug", type: "text", half: true }, { name: "countryCode", label: "Country", type: "relation", relation: "countries", required: true, half: true }, { name: "state", label: "State / region", type: "text", half: true }, { name: "city", label: "City", type: "text", required: true, half: true }, { name: "address", label: "Address", type: "text", half: true }, { name: "disciplines", label: "Disciplines", type: "multiselect", options: GYM_DISCIPLINES }, { name: "description", label: "Description", type: "textarea", required: true }, { name: "programs", label: "Training programmes", type: "list", help: "One per line." }, { name: "phone", label: "Phone", type: "text", half: true }, { name: "email", label: "Email", type: "text", half: true }, { name: "website", label: "Website", type: "text", half: true }, { name: "foundedYear", label: "Founded", type: "number", int: true, half: true }, { name: "photoUrl", label: "Photo URL", type: "text" }, { name: "aclAffiliated", label: "ACL affiliated", type: "boolean" }],
  },
  {
    key: "coaches", model: "coach", label: "Coaches", singular: "coach", permission: "gyms.manage", orderBy: { name: "asc" }, search: ["name"], include: { gym: true }, title: (r) => s(r.name),
    columns: [["name", "Coach"], ["gym.name", "Gym"]],
    fields: [{ name: "name", label: "Name", type: "text", required: true, half: true }, { name: "gymId", label: "Gym", type: "relation", relation: "gyms", half: true }, { name: "bio", label: "Bio", type: "textarea" }],
  },
  {
    key: "rivalries", model: "rivalry", label: "Rivalries", singular: "rivalry", permission: "content.manage", orderBy: { title: "asc" }, title: (r) => s(r.title), slugFrom: (d) => s(d.title), publicPath: (r) => `/rivalries/${r.slug}`,
    columns: [["title", "Rivalry"], ["type", "Type"], ["featured", "Featured"]],
    fields: [{ name: "title", label: "Title", type: "text", required: true, half: true }, { name: "type", label: "Type", type: "select", options: ["FIGHTER", "REGION"], required: true, half: true }, { name: "tagline", label: "Tagline", type: "text", required: true }, { name: "origin", label: "Origin of the rivalry", type: "textarea", required: true }, { name: "sideA", label: "Side A name", type: "text", required: true, half: true, help: "Fighter name, or a state / city / country exactly as stored on fighters." }, { name: "sideB", label: "Side B name", type: "text", required: true, half: true }, { name: "fighterAId", label: "Fighter A", type: "relation", relation: "fighters", half: true }, { name: "fighterBId", label: "Fighter B", type: "relation", relation: "fighters", half: true }, { name: "eventId", label: "Event", type: "relation", relation: "events", half: true }, { name: "fightId", label: "Fight", type: "relation", relation: "fights", half: true }, { name: "featured", label: "Featured", type: "boolean", half: true }, { name: "slug", label: "URL slug", type: "text", half: true }],
    beforeSave: (d, ctx) => {
      const type = d.type ?? ctx.before?.type;
      if (type === "FIGHTER" && !((d.fighterAId ?? ctx.before?.fighterAId) && (d.fighterBId ?? ctx.before?.fighterBId))) throw new ApiError(422, "validation", "Fighter rivalries need both fighters.", { fighterAId: "Required", fighterBId: "Required" });
    },
  },
  {
    key: "rivalry-moments", model: "rivalryMoment", label: "Rivalry timeline", singular: "timeline moment", permission: "content.manage", orderBy: { date: "desc" }, include: { rivalry: true }, title: (r) => s(r.title),
    columns: [["rivalry.title", "Rivalry"], ["date", "Date"], ["kind", "Kind"], ["title", "Moment"]],
    fields: [{ name: "rivalryId", label: "Rivalry", type: "relation", relation: "rivalries", required: true, half: true }, { name: "date", label: "Date", type: "datetime", required: true, half: true }, { name: "kind", label: "Kind", type: "select", options: ["Confrontation", "Callout", "Contract", "Face-off", "Announcement", "Fight night", "Quote", "Social"], required: true, half: true }, { name: "title", label: "Title", type: "text", required: true, half: true }, { name: "body", label: "Text / quote", type: "textarea", required: true }, { name: "quoteBy", label: "Quote attributed to", type: "text", half: true }, { name: "videoId", label: "Video", type: "relation", relation: "videos", half: true }],
  },
  {
    key: "media-assets", model: "mediaAsset", label: "Media assets", singular: "media asset", permission: "content.manage", orderBy: { publishedAt: "desc" }, title: (r) => s(r.title), publicPath: () => "/media",
    columns: [["title", "Title"], ["kind", "Kind"], ["publishedAt", "Published"]],
    fields: [{ name: "title", label: "Title", type: "text", required: true }, { name: "kind", label: "Kind", type: "select", options: ["PRESS_RELEASE", "LOGO", "MEDIA_KIT", "FIGHT_CARD", "STATISTICS", "FIGHTER_BIOS"], required: true, half: true }, { name: "publishedAt", label: "Published", type: "datetime", half: true }, { name: "description", label: "Summary", type: "textarea", required: true }, { name: "body", label: "Press release text", type: "textarea" }, { name: "fileUrl", label: "File URL", type: "text", half: true }, { name: "eventId", label: "Event", type: "relation", relation: "events", half: true }],
  },
  {
    key: "polls", model: "poll", label: "Polls", singular: "poll", permission: "community.moderate", orderBy: { createdAt: "desc" }, title: (r) => s(r.question), publicPath: () => "/community",
    columns: [["question", "Question"], ["active", "Active"], ["createdAt", "Created"]],
    fields: [{ name: "question", label: "Question", type: "text", required: true }, { name: "optionLabels", label: "Options", type: "list", createOnly: true, help: "One option per line (set when the poll is created)." }, { name: "active", label: "Active", type: "boolean" }],
    beforeSave: (d, ctx) => {
      const labels = (d.optionLabels as string[] | undefined) ?? [];
      delete d.optionLabels;
      if (ctx.isCreate) {
        if (labels.length < 2) throw new ApiError(422, "validation", "Add at least two options.", { optionLabels: "At least two options" });
        d.options = { create: labels.map((label) => ({ label })) };
      }
    },
  },
  { key: "tags", model: "tag", label: "Tags", singular: "tag", permission: "content.manage", orderBy: { name: "asc" }, title: (r) => s(r.name), slugFrom: (d) => s(d.name), columns: [["name", "Tag"], ["slug", "Slug"]], fields: [{ name: "name", label: "Name", type: "text", required: true, half: true }, { name: "slug", label: "Slug", type: "text", half: true }] },
  {
    key: "currencies", model: "currency", idField: "code", label: "Currencies", singular: "currency", permission: "settings.manage", orderBy: { code: "asc" }, title: (r) => `${r.code} — ${r.name}`,
    columns: [["code", "Code"], ["name", "Name"], ["symbol", "Symbol"], ["perUsd", "Per 1 USD"]],
    fields: [{ name: "code", label: "ISO code", type: "text", required: true, half: true, createOnly: true }, { name: "name", label: "Name", type: "text", required: true, half: true }, { name: "symbol", label: "Symbol", type: "text", required: true, half: true }, { name: "perUsd", label: "Units per 1 USD", type: "number", required: true, half: true, help: "Display-conversion rate. Update regularly." }],
  },
  { key: "countries", model: "country", idField: "code", label: "Countries", singular: "country", permission: "settings.manage", orderBy: { name: "asc" }, title: (r) => s(r.name), noCreate: true, noDelete: true, columns: [["name", "Country"], ["code", "Code"], ["aclMarket", "ACL market"]], fields: [{ name: "aclMarket", label: "Priority ACL market", type: "boolean" }] },
];

export const RESOURCES: Record<string, AdminResource> = Object.fromEntries(list.map((r) => [r.key, r]));

/** Runs when a result is recorded: settles fan predictions, alerts followers and moves the belt if it changed hands. */
export async function finaliseFight(fightId: string) {
  const f = await db.fight.findUniqueOrThrow({ where: { id: fightId }, include: { fighterA: true, fighterB: true, event: true, division: true } });
  if (f.status !== "COMPLETED") return;
  await settlePredictions(f.id);
  const winner = f.winnerId === f.fighterAId ? f.fighterA : f.winnerId === f.fighterBId ? f.fighterB : null;
  const loser = winner ? (winner.id === f.fighterAId ? f.fighterB : f.fighterA) : null;
  await notifyFollowers([f.fighterAId, f.fighterBId], { type: "RESULT", title: winner ? `${winner.lastName} def. ${loser!.lastName}` : `${f.fighterA.lastName} vs ${f.fighterB.lastName}: ${f.method === "NC" ? "no contest" : "draw"}`, body: `${f.event.name}${f.method ? ` — ${f.method}${f.endRound ? ` R${f.endRound}` : ""}` : ""}`, url: `/fights/${f.slug}` });
  if (f.isTitleFight && winner && f.method !== "NC") {
    const reign = await db.titleReign.findFirst({ where: { divisionId: f.divisionId, lostAt: null } });
    if (!reign || reign.fighterId !== winner.id) {
      await db.$transaction([
        ...(reign ? [db.titleReign.update({ where: { id: reign.id }, data: { lostAt: f.event.startsAt } })] : []),
        db.titleReign.create({ data: { divisionId: f.divisionId, fighterId: winner.id, wonAt: f.event.startsAt, wonFightId: f.id, note: reign ? null : "Won vacant title" } }),
        db.ranking.deleteMany({ where: { fighterId: winner.id } }), // the champion sits above the rankings
      ]);
    }
  }
}
