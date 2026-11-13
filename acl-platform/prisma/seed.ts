/**
 * DEMO DATA. Every fighter, gym, sponsor, result and statistic below is fictional
 * and exists only to exercise the platform. Replace through the admin CMS.
 */
import { PrismaClient, type ArticleCategory, type ResultMethod, type VideoCategory, type CardPosition } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const db = new PrismaClient();
const DEMO_PASSWORD = "AclDemo!2026";

function hash(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(pw, salt, 64).toString("hex")}`;
}
const at = (iso: string) => new Date(iso);
// Deterministic pseudo-random so reseeding produces the same demo world.
let seedState = 20261128;
const rnd = () => ((seedState = (seedState * 1664525 + 1013904223) % 4294967296) / 4294967296);
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];

const COUNTRIES: [string, string, string][] = [
  ["DZ", "012", "Algeria"], ["AO", "024", "Angola"], ["BJ", "204", "Benin"], ["BW", "072", "Botswana"], ["BF", "854", "Burkina Faso"],
  ["BI", "108", "Burundi"], ["CV", "132", "Cabo Verde"], ["CM", "120", "Cameroon"], ["CF", "140", "Central African Republic"], ["TD", "148", "Chad"],
  ["KM", "174", "Comoros"], ["CG", "178", "Congo"], ["CD", "180", "DR Congo"], ["CI", "384", "Côte d’Ivoire"], ["DJ", "262", "Djibouti"],
  ["EG", "818", "Egypt"], ["GQ", "226", "Equatorial Guinea"], ["ER", "232", "Eritrea"], ["SZ", "748", "Eswatini"], ["ET", "231", "Ethiopia"],
  ["GA", "266", "Gabon"], ["GM", "270", "Gambia"], ["GH", "288", "Ghana"], ["GN", "324", "Guinea"], ["GW", "624", "Guinea-Bissau"],
  ["KE", "404", "Kenya"], ["LS", "426", "Lesotho"], ["LR", "430", "Liberia"], ["LY", "434", "Libya"], ["MG", "450", "Madagascar"],
  ["MW", "454", "Malawi"], ["ML", "466", "Mali"], ["MR", "478", "Mauritania"], ["MU", "480", "Mauritius"], ["MA", "504", "Morocco"],
  ["MZ", "508", "Mozambique"], ["NA", "516", "Namibia"], ["NE", "562", "Niger"], ["NG", "566", "Nigeria"], ["RW", "646", "Rwanda"],
  ["ST", "678", "São Tomé and Príncipe"], ["SN", "686", "Senegal"], ["SC", "690", "Seychelles"], ["SL", "694", "Sierra Leone"], ["SO", "706", "Somalia"],
  ["ZA", "710", "South Africa"], ["SS", "728", "South Sudan"], ["SD", "729", "Sudan"], ["TZ", "834", "Tanzania"], ["TG", "768", "Togo"],
  ["TN", "788", "Tunisia"], ["UG", "800", "Uganda"], ["ZM", "894", "Zambia"], ["ZW", "716", "Zimbabwe"],
];
const MARKETS = ["NG", "GH", "ZA", "CM", "KE", "UG", "TZ", "RW", "SN", "CI", "MA", "EG", "DZ", "TN"];

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEMO_SEED) {
    throw new Error("Refusing to load demo data in production. Set ALLOW_DEMO_SEED=1 to override.");
  }
  // Clean slate (order matters only where cascades do not apply).
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);

  await db.country.createMany({ data: COUNTRIES.map(([code, numeric, name]) => ({ code, numeric, name, aclMarket: MARKETS.includes(code) })) });
  await db.currency.createMany({
    data: [
      { code: "USD", name: "US Dollar", symbol: "$", perUsd: 1 },
      { code: "NGN", name: "Nigerian Naira", symbol: "₦", perUsd: 1600 },
      { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", perUsd: 12.5 },
      { code: "KES", name: "Kenyan Shilling", symbol: "KSh", perUsd: 129 },
      { code: "ZAR", name: "South African Rand", symbol: "R", perUsd: 18 },
      { code: "XOF", name: "West African CFA Franc", symbol: "CFA", perUsd: 600 },
      { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", perUsd: 600 },
      { code: "UGX", name: "Ugandan Shilling", symbol: "USh", perUsd: 3700 },
      { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", perUsd: 2600 },
      { code: "RWF", name: "Rwandan Franc", symbol: "FRw", perUsd: 1400 },
    ],
  });
  await db.siteSetting.createMany({
    data: [
      { key: "demoMode", value: "true" },
      { key: "contactEmail", value: "hello@africacombatleague.example" },
      { key: "pressEmail", value: "press@africacombatleague.example" },
      { key: "partnershipsEmail", value: "partners@africacombatleague.example" },
      { key: "instagramUrl", value: "" }, { key: "tiktokUrl", value: "" }, { key: "youtubeUrl", value: "" }, { key: "xUrl", value: "" }, { key: "facebookUrl", value: "" },
    ],
  });

  // ── Divisions
  const DIVS: [string, string, "MEN" | "WOMEN", number | null, number | null][] = [
    ["heavyweight", "Heavyweight", "MEN", null, null],
    ["cruiserweight", "Cruiserweight", "MEN", 200, 90.7],
    ["middleweight", "Middleweight", "MEN", 160, 72.6],
    ["welterweight", "Welterweight", "MEN", 147, 66.7],
    ["lightweight", "Lightweight", "MEN", 135, 61.2],
    ["featherweight", "Featherweight", "MEN", 126, 57.2],
    ["bantamweight", "Bantamweight", "MEN", 118, 53.5],
    ["womens-featherweight", "Women’s Featherweight", "WOMEN", 126, 57.2],
  ];
  const div: Record<string, string> = {};
  for (const [i, [slug, name, gender, limitLbs, limitKg]] of DIVS.entries()) {
    div[slug] = (await db.division.create({ data: { slug, name, gender, limitLbs, limitKg, sortOrder: i } })).id;
  }

  // ── Gyms + coaches
  const GYMS: [string, string, string, string | null, string, string[], string, number, boolean, string][] = [
    ["enyimba-boxing-academy", "Enyimba Boxing Academy", "NG", "Abia", "Aba", ["Boxing", "Fitness"], "Chief Obinna Kalu", 2009, true, "Aba's fight factory. Built in a converted textile warehouse off Ngwa Road, it has turned market-town toughness into professional craft for more than a decade."],
    ["heartland-fight-club", "Heartland Fight Club", "NG", "Imo", "Owerri", ["Boxing", "Kickboxing"], "Coach Uche Iheanacho", 2013, true, "Owerri's home of technical boxing. Heartland drills footwork before anything else, and its fighters are known for ring IQ."],
    ["surulere-boxing-lab", "Surulere Boxing Lab", "NG", "Lagos", "Lagos", ["Boxing", "Fitness", "MMA"], "Coach Tunde Balogun", 2011, true, "A Lagos institution in the shadow of the National Stadium, mixing old-school sparring with modern strength and conditioning."],
    ["bukom-champions-gym", "Bukom Champions Gym", "GH", "Greater Accra", "Accra", ["Boxing"], "Coach Nii Lamptey", 1998, true, "From the fishing community that has produced generations of Ghanaian fighters. Small ring, loud walls, relentless work."],
    ["soweto-fight-factory", "Soweto Fight Factory", "ZA", "Gauteng", "Johannesburg", ["Boxing", "MMA", "Kickboxing", "Wrestling"], "Coach Pieter van Wyk", 2006, true, "A multi-discipline performance centre serving fighters from across South Africa, with altitude conditioning built in."],
    ["douala-lions-combat-club", "Douala Lions Combat Club", "CM", "Littoral", "Douala", ["Boxing", "Wrestling"], "Coach Samuel Etame", 2010, true, "Cameroon's port city powerhouse, famous for big men with fast hands."],
    ["nairobi-elite-boxing", "Nairobi Elite Boxing", "KE", "Nairobi County", "Nairobi", ["Boxing", "Fitness"], "Coach Grace Wanjiru", 2015, true, "East Africa's fastest-growing boxing programme, with a youth academy feeding a professional stable."],
    ["kampala-bombers-academy", "Kampala Bombers Academy", "UG", "Central Region", "Kampala", ["Boxing"], "Coach Isaac Lubega", 2004, false, "Carrying on Uganda's proud amateur tradition and channelling it into the professional ranks."],
    ["casablanca-atlas-boxing", "Casablanca Atlas Boxing", "MA", "Casablanca-Settat", "Casablanca", ["Boxing", "Kickboxing"], "Coach Rachid El Idrissi", 2008, false, "North Africa's technical school: long jabs, sharp counters and European-style amateur pedigree."],
    ["dakar-teranga-fight-team", "Dakar Teranga Fight Team", "SN", "Dakar", "Dakar", ["Boxing", "Wrestling", "MMA"], "Coach Ousmane Faye", 2012, false, "Where Senegalese wrestling heritage meets boxing. Strong bases, stronger wills."],
  ];
  const gym: Record<string, { id: string; coachId: string }> = {};
  for (const [slug, name, countryCode, state, city, disciplines, coachName, foundedYear, aclAffiliated, description] of GYMS) {
    const g = await db.gym.create({
      data: {
        slug, name, countryCode, state, city, disciplines, description, foundedYear, aclAffiliated,
        programs: ["Professional stable", "Amateur development", "Youth academy (ages 10–17)", ...(disciplines.includes("Fitness") ? ["Boxing fitness classes"] : [])],
        address: `Demo address, ${city}`, email: `info@${slug}.example`, phone: "+000 000 0000",
      },
    });
    const c = await db.coach.create({ data: { name: coachName, gymId: g.id, bio: `Head coach at ${name}.` } });
    gym[slug] = { id: g.id, coachId: c.id };
  }

  // ── Fighters: [slug, first, nick, last, country, state, city, division, gym, dob, height, reach, stance, style, prior W-L-D-KO, featured, quote, bio]
  type F = [string, string, string, string, string, string | null, string, string, string | null, string, number, number, "ORTHODOX" | "SOUTHPAW" | "SWITCH", string, [number, number, number, number], boolean, string, string];
  const FIGHTERS: F[] = [
    ["babajide-adeyemi", "Babajide", "The Mountain", "Adeyemi", "NG", "Lagos", "Lagos", "heavyweight", "surulere-boxing-lab", "1995-04-11", 198, 208, "ORTHODOX", "Slugger", [15, 0, 0, 13], true, "You cannot move a mountain. You can only climb it and fall.", "The first ACL heavyweight champion. A former dock worker from Apapa who found boxing at 19 and has not lost since turning professional."],
    ["thabo-mokoena", "Thabo", "Thunder", "Mokoena", "ZA", "Gauteng", "Johannesburg", "heavyweight", "soweto-fight-factory", "1993-09-02", 193, 201, "ORTHODOX", "Boxer-puncher", [17, 1, 0, 11], true, "He caught me once. Lightning does not strike the same place twice — thunder does.", "Soweto's heavyweight hope. A polished boxer-puncher with national amateur titles, chasing revenge and the belt."],
    ["jean-paul-mbarga", "Jean-Paul", "Le Lion", "Mbarga", "CM", "Littoral", "Douala", "cruiserweight", "douala-lions-combat-club", "1994-01-23", 188, 196, "ORTHODOX", "Boxer-puncher", [14, 1, 1, 9], true, "In Douala we do not train to compete. We train to rule.", "Cameroon's cruiserweight king. Fast hands for a big man and a jab that controls every exchange."],
    ["emeka-uzor", "Emeka", "Aba Hammer", "Uzor", "NG", "Abia", "Aba", "cruiserweight", "enyimba-boxing-academy", "1996-06-30", 185, 190, "ORTHODOX", "Slugger", [11, 2, 0, 10], false, "Aba makes things that last. My right hand is made in Aba.", "A heavy-handed finisher from the commercial heart of Abia State. Every fight is a short night for somebody."],
    ["ikenna-anyanwu", "Ikenna", "Owerri Express", "Anyanwu", "NG", "Imo", "Owerri", "cruiserweight", "heartland-fight-club", "1995-11-14", 187, 195, "SOUTHPAW", "Out-boxer", [13, 0, 0, 5], false, "They gave him the cards in Johannesburg. In Aba I will take the cards out of it.", "A slick southpaw who was unbeaten before 2026. Believes he has already beaten Uzor once and intends to prove it."],
    ["kofi-asante", "Kofi", "Black Star", "Asante", "GH", "Greater Accra", "Accra", "middleweight", "bukom-champions-gym", "1994-08-19", 182, 188, "ORTHODOX", "Counter-puncher", [18, 1, 0, 8], true, "Bukom raised me to hit and not get hit. The belt stays in Accra.", "ACL middleweight champion and the league's most patient technician. Makes world-class fighters miss by centimetres."],
    ["youssef-benali", "Youssef", "The Atlas", "Benali", "MA", "Casablanca-Settat", "Casablanca", "middleweight", "casablanca-atlas-boxing", "1996-02-05", 184, 191, "ORTHODOX", "Out-boxer", [16, 0, 0, 7], false, "One judge had it for me. Next time I leave nothing for judges.", "Morocco's long, rangy contender. Pushed the champion to a majority decision and wants the rematch."],
    ["brian-otieno", "Brian", "Nairobi Night", "Otieno", "KE", "Nairobi County", "Nairobi", "middleweight", "nairobi-elite-boxing", "1997-12-01", 180, 184, "SWITCH", "Swarmer", [10, 1, 0, 6], false, "Nairobi has waited long enough for a fight night of its own.", "Kenya's crowd favourite. A switch-hitting volume puncher who never takes a backward step."],
    ["kwabena-addo", "Kwabena", "Bukom Storm", "Addo", "GH", "Greater Accra", "Accra", "welterweight", "bukom-champions-gym", "1995-03-27", 177, 183, "ORTHODOX", "Boxer-puncher", [19, 0, 1, 12], true, "Two Nigerians are fighting for the right to lose to me.", "The undefeated ACL welterweight champion. Combines Accra's boxing tradition with genuine one-punch power."],
    ["chidubem-nwosu", "Chidubem", "Iron Lion", "Nwosu", "NG", "Imo", "Owerri", "welterweight", "heartland-fight-club", "1996-07-09", 178, 185, "ORTHODOX", "Counter-puncher", [14, 0, 0, 8], true, "Imo does not go to Aba to visit. We go to collect.", "Owerri's number-one contender. Lost a split decision for the title and has been asking for Okoro ever since."],
    ["kenechukwu-okoro", "Kenechukwu", "The Viper", "Okoro", "NG", "Abia", "Aba", "welterweight", "enyimba-boxing-academy", "1997-05-18", 176, 182, "SOUTHPAW", "Pressure fighter", [11, 1, 0, 8], true, "A viper does not chase. It waits for you to come close — then it is already too late.", "The pride of Aba. A southpaw pressure fighter who grew up selling in Ariaria Market and now sells out arenas."],
    ["sizwe-dlamini", "Sizwe", "The Surgeon", "Dlamini", "ZA", "KwaZulu-Natal", "Durban", "welterweight", "soweto-fight-factory", "1994-10-21", 179, 186, "ORTHODOX", "Out-boxer", [15, 2, 0, 6], false, "I have been cut by the best. Now I do the cutting.", "A Durban technician rebuilding after two hard nights against Nigeria's best."],
    ["moses-ssebunya", "Moses", "Kampala Kid", "Ssebunya", "UG", "Central Region", "Kampala", "lightweight", "kampala-bombers-academy", "1998-01-15", 173, 178, "ORTHODOX", "Swarmer", [13, 0, 0, 7], true, "Uganda taught Africa how to box. I am the reminder.", "ACL lightweight champion at 28. A product of Uganda's amateur system with an engine that never stops."],
    ["mamadou-diop", "Mamadou", "Teranga", "Diop", "SN", "Dakar", "Dakar", "lightweight", "dakar-teranga-fight-team", "1997-09-08", 175, 180, "SOUTHPAW", "Pressure fighter", [12, 1, 0, 8], false, "Teranga means hospitality. In the ring, I am a terrible host.", "A former wrestler from Dakar who brings a wrestler's strength to close-range boxing."],
    ["lwazi-ndlovu", "Lwazi", "Quicksilver", "Ndlovu", "ZA", "Western Cape", "Cape Town", "featherweight", "soweto-fight-factory", "1998-06-03", 170, 175, "SOUTHPAW", "Out-boxer", [14, 0, 0, 4], false, "You cannot hit what has already left.", "The fastest hands in the league. ACL featherweight champion and a defensive puzzle nobody has solved."],
    ["juma-mwakyusa", "Juma", "Simba", "Mwakyusa", "TZ", "Dar es Salaam", "Dar es Salaam", "featherweight", "nairobi-elite-boxing", "1997-03-12", 169, 172, "ORTHODOX", "Pressure fighter", [12, 1, 1, 7], false, "The lion does not need to be fast. He needs to be close.", "Tanzania's first ACL contender, based in Nairobi. Walks through fire to land his left hook."],
    ["karim-mansour", "Karim", "Pharaoh", "Mansour", "EG", "Cairo", "Cairo", "bantamweight", null, "1996-12-25", 166, 170, "ORTHODOX", "Boxer-puncher", [16, 1, 0, 9], false, "Five thousand years of history are standing in my corner.", "ACL bantamweight champion from Cairo. A decorated amateur with a professional's spite."],
    ["eric-habimana", "Eric", "Kigali Cobra", "Habimana", "RW", "Kigali", "Kigali", "bantamweight", "kampala-bombers-academy", "1999-04-04", 165, 171, "SOUTHPAW", "Counter-puncher", [9, 0, 0, 4], false, "Rwanda is small. So is a cobra.", "At 27 the youngest contender in the league and Rwanda's first. Trains across the border in Kampala."],
    ["adaeze-eze", "Adaeze", "Queen Cobra", "Eze", "NG", "Abia", "Umuahia", "womens-featherweight", "enyimba-boxing-academy", "1997-08-28", 168, 172, "ORTHODOX", "Boxer-puncher", [10, 0, 0, 6], true, "They asked if women's boxing sells in Africa. I asked them to count the seats.", "The first women's champion in ACL history. Umuahia-born, Aba-trained, and the league's most-followed woman."],
    ["abena-owusu", "Abena", "Golden Gloves", "Owusu", "GH", "Ashanti", "Kumasi", "womens-featherweight", "bukom-champions-gym", "1998-02-17", 167, 170, "SOUTHPAW", "Swarmer", [9, 0, 0, 3], false, "A draw is a door left open. I am walking through it.", "Kumasi's southpaw challenger. Fought the champion to a split draw and believes the third fight is hers."],
  ];
  const fighter: Record<string, string> = {};
  for (const [slug, firstName, nickname, lastName, countryCode, state, city, d, g, dob, heightCm, reachCm, stance, style, [w, l, dr, ko], featured, quote, bio] of FIGHTERS) {
    const handle = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z]/g, "");
    fighter[slug] = (
      await db.fighter.create({
        data: {
          slug, firstName, nickname, lastName, countryCode, state, city, divisionId: div[d], gymId: g ? gym[g].id : null, coachId: g ? gym[g].coachId : null,
          gender: d.startsWith("womens") ? "WOMEN" : "MEN", dateOfBirth: at(`${dob}T00:00:00Z`), heightCm, reachCm, stance, style, featured, quote, bio,
          story: `${bio}\n\n${firstName} turned professional in ${2026 - Math.max(3, Math.round((w + l + dr) / 3))} and built a ${w}–${l}–${dr} record on regional cards before signing with Africa Combat League for its inaugural season.\n\nOutside the ring ${firstName} is closely tied to ${city}: the gym, the neighbourhood and the supporters who travel to every card. (Demo biography — replace with the athlete's real story in the CMS.)`,
          priorWins: w, priorLosses: l, priorDraws: dr, priorKos: ko,
          proDebut: at(`${2026 - Math.max(3, Math.round((w + l + dr) / 3))}-02-01T00:00:00Z`),
          instagram: `${handle}.demo`, xHandle: `${handle}_demo`, tiktok: null,
        },
      })
    ).id;
  }

  // ── Sponsors (fictional)
  const SPONSORS: [string, string, "TITLE" | "PREMIER" | "OFFICIAL" | "SUPPORTING", string][] = [
    ["savanna-mobile", "Savanna Mobile", "TITLE", "Official connectivity partner (demo sponsor)."],
    ["kora-bank", "Kora Bank", "PREMIER", "Official banking partner (demo sponsor)."],
    ["zuma-energy-drink", "Zuma Energy", "OFFICIAL", "Official energy drink (demo sponsor)."],
    ["baobab-air", "Baobab Air", "OFFICIAL", "Official airline (demo sponsor)."],
    ["ironwood-sportswear", "Ironwood Sportswear", "SUPPORTING", "Official glove and apparel supplier (demo sponsor)."],
  ];
  const sponsorIds: string[] = [];
  for (const [slug, name, tier, description] of SPONSORS) sponsorIds.push((await db.sponsor.create({ data: { slug, name, tier, description } })).id);

  // ── Events
  const EVENTS: [string, string, string | null, string, string, string, string, string | null, string, string, "COMPLETED" | "SCHEDULED", string | null, string | null][] = [
    ["acl-001-genesis", "ACL 001: Genesis", "001", "Where it begins", "2026-03-14T18:00:00Z", "Atlantic Arena", "Lagos", "Lagos", "NG", "The inaugural Africa Combat League card. Four championships were decided on one night in Lagos as the league introduced itself to the continent.", "COMPLETED", null, null],
    ["acl-002-gold-coast", "ACL 002: Gold Coast", "002", "Accra crowns its kings", "2026-06-20T18:00:00Z", "Independence Dome", "Accra", "Greater Accra", "GH", "ACL travelled to Ghana for a five-fight card headlined by a welterweight title fight that split the judges and started a feud.", "COMPLETED", null, null],
    ["acl-003-highveld", "ACL 003: Highveld", "003", "Thin air. Heavy hands.", "2026-09-19T17:00:00Z", "Highveld Arena", "Johannesburg", "Gauteng", "ZA", "Altitude, a middleweight title defence and two results that set up the biggest domestic rivalry of the season.", "COMPLETED", null, null],
    ["acl-state-wars-001", "ACL State Wars 001: Abia vs Imo", "001", "The Oriental War", "2026-11-28T18:00:00Z", "Enyimba Dome", "Aba", "Abia", "NG", "Two neighbouring states. One ring. ACL State Wars pits Abia's fighters against Imo's in the first edition of the league's regional rivalry series, with a welterweight title eliminator on top and two championship fights in support.", "SCHEDULED", "ABIA", "IMO"],
    ["acl-004-nairobi-nights", "ACL 004: Nairobi Nights", "004", "East Africa's first", "2027-02-20T17:00:00Z", "Savannah Arena", "Nairobi", "Nairobi County", "KE", "The league's East African debut. The heavyweight title rematch headlines, with Kenya's Brian Otieno fighting at home.", "SCHEDULED", null, null],
  ];
  const event: Record<string, string> = {};
  for (const [slug, name, number, tagline, startsAt, venue, city, state, countryCode, description, status, sideA, sideB] of EVENTS) {
    event[slug] = (
      await db.event.create({
        data: {
          slug, name, number, tagline, startsAt: at(startsAt), venue, city, state, countryCode, description, status, sideA, sideB,
          venueInfo: `Doors open two hours before the first bell. ${venue} is a fully seated indoor arena; bring a valid ID matching your ticket. (Demo venue.)`,
          broadcast: "Streaming live on ACL Watch",
          sponsors: { connect: sponsorIds.map((id) => ({ id })) },
        },
      })
    ).id;
  }
  // Fight-week programme for State Wars
  const PROGRAMME: [string, string, "PRESS_CONFERENCE" | "OPEN_WORKOUT" | "WEIGH_IN" | "FAN_EVENT", string, string, string, string, string][] = [
    ["state-wars-001-press-conference", "State Wars 001: Final Press Conference", "PRESS_CONFERENCE", "2026-11-24T12:00:00Z", "Heartland Civic Hall", "Owerri", "Imo", "Okoro and Nwosu face the media in Imo's capital. Open to accredited press; streamed on ACL Watch."],
    ["state-wars-001-open-workout", "State Wars 001: Open Workouts", "OPEN_WORKOUT", "2026-11-25T15:00:00Z", "Ariaria Market Square", "Aba", "Abia", "Free public workouts in the heart of Aba. Meet the fighters and collect signed posters."],
    ["state-wars-001-fan-fest", "State Wars 001: Fan Fest", "FAN_EVENT", "2026-11-26T14:00:00Z", "Enyimba Dome Forecourt", "Aba", "Abia", "Music, food, merchandise and fighter meet-and-greets. Free entry with any State Wars ticket."],
    ["state-wars-001-weigh-in", "State Wars 001: Official Weigh-In", "WEIGH_IN", "2026-11-27T13:00:00Z", "Enyimba Dome", "Aba", "Abia", "All eight fighters step on the scale, followed by the final face-offs. Free and open to the public."],
  ];
  for (const [slug, name, type, startsAt, venue, city, state, description] of PROGRAMME) {
    await db.event.create({ data: { slug, name, type, startsAt: at(startsAt), venue, city, state, countryCode: "NG", description, parentEventId: event["acl-state-wars-001"] } });
  }

  // ── Fights: [event, A, B, division, rounds, position, order, title, winner 'A'|'B'|null|undefined, method, round, time, bonus]
  type FT = [string, string, string, string, number, CardPosition, number, boolean, "A" | "B" | "D" | null, ResultMethod | null, number | null, string | null, boolean];
  const FIGHTS: FT[] = [
    ["acl-001-genesis", "babajide-adeyemi", "thabo-mokoena", "heavyweight", 12, "MAIN_EVENT", 5, true, "A", "KO", 6, "2:41", true],
    ["acl-001-genesis", "kenechukwu-okoro", "sizwe-dlamini", "welterweight", 10, "CO_MAIN", 4, false, "A", "TKO", 8, "1:12", false],
    ["acl-001-genesis", "kofi-asante", "brian-otieno", "middleweight", 12, "UNDERCARD", 3, true, "A", "UD", null, null, false],
    ["acl-001-genesis", "karim-mansour", "eric-habimana", "bantamweight", 12, "UNDERCARD", 2, true, "A", "UD", null, null, false],
    ["acl-001-genesis", "adaeze-eze", "abena-owusu", "womens-featherweight", 10, "UNDERCARD", 1, true, "A", "TKO", 5, "1:58", false],
    ["acl-002-gold-coast", "kwabena-addo", "chidubem-nwosu", "welterweight", 12, "MAIN_EVENT", 5, true, "A", "SD", null, null, false],
    ["acl-002-gold-coast", "moses-ssebunya", "mamadou-diop", "lightweight", 12, "CO_MAIN", 4, true, "A", "UD", null, null, false],
    ["acl-002-gold-coast", "jean-paul-mbarga", "ikenna-anyanwu", "cruiserweight", 12, "UNDERCARD", 3, true, "A", "TKO", 9, "2:20", true],
    ["acl-002-gold-coast", "youssef-benali", "brian-otieno", "middleweight", 10, "UNDERCARD", 2, false, "A", "KO", 3, "0:54", false],
    ["acl-002-gold-coast", "lwazi-ndlovu", "juma-mwakyusa", "featherweight", 12, "UNDERCARD", 1, true, "A", "UD", null, null, false],
    ["acl-003-highveld", "kofi-asante", "youssef-benali", "middleweight", 12, "MAIN_EVENT", 4, true, "A", "MD", null, null, false],
    ["acl-003-highveld", "chidubem-nwosu", "sizwe-dlamini", "welterweight", 10, "CO_MAIN", 3, false, "A", "KO", 4, "2:03", true],
    ["acl-003-highveld", "emeka-uzor", "ikenna-anyanwu", "cruiserweight", 10, "UNDERCARD", 2, false, "A", "SD", null, null, false],
    ["acl-003-highveld", "adaeze-eze", "abena-owusu", "womens-featherweight", 10, "UNDERCARD", 1, true, "D", "DRAW", null, null, false],
    ["acl-state-wars-001", "kenechukwu-okoro", "chidubem-nwosu", "welterweight", 12, "MAIN_EVENT", 4, false, null, null, null, null, false],
    ["acl-state-wars-001", "emeka-uzor", "ikenna-anyanwu", "cruiserweight", 10, "CO_MAIN", 3, false, null, null, null, null, false],
    ["acl-state-wars-001", "karim-mansour", "eric-habimana", "bantamweight", 12, "UNDERCARD", 2, true, null, null, null, null, false],
    ["acl-state-wars-001", "moses-ssebunya", "mamadou-diop", "lightweight", 12, "UNDERCARD", 1, true, null, null, null, null, false],
    ["acl-004-nairobi-nights", "babajide-adeyemi", "thabo-mokoena", "heavyweight", 12, "MAIN_EVENT", 2, true, null, null, null, null, false],
    ["acl-004-nairobi-nights", "brian-otieno", "youssef-benali", "middleweight", 10, "CO_MAIN", 1, false, null, null, null, null, false],
  ];
  const fights: { id: string; slug: string; a: string; b: string; ev: string; done: boolean; winner: string | null; title: boolean; division: string; method: ResultMethod | null }[] = [];
  const seenPair = new Map<string, number>();
  for (const [ev, a, b, d, rounds, position, order, isTitleFight, res, method, endRound, endTime, performanceBonus] of FIGHTS) {
    const la = a.split("-").pop()!, lb = b.split("-").pop()!;
    const pairKey = [la, lb].sort().join("-");
    const n = (seenPair.get(pairKey) ?? 0) + 1;
    seenPair.set(pairKey, n);
    const slug = `${la}-vs-${lb}${n > 1 ? `-${n}` : ""}`;
    const done = res !== null;
    const winnerId = res === "A" ? fighter[a] : res === "B" ? fighter[b] : null;
    const f = await db.fight.create({
      data: {
        slug, eventId: event[ev], fighterAId: fighter[a], fighterBId: fighter[b], divisionId: div[d], rounds, position, order, isTitleFight,
        status: done ? "COMPLETED" : "SCHEDULED", winnerId, method, endRound, endTime, performanceBonus,
        fightType: isTitleFight ? "ACL Championship" : position === "MAIN_EVENT" && ev === "acl-state-wars-001" ? "Title eliminator" : "Professional boxing",
      },
    });
    fights.push({ id: f.id, slug, a: fighter[a], b: fighter[b], ev, done, winner: winnerId, title: isTitleFight, division: d, method });
    // Scorecards for decisions (demo)
    if (method && ["UD", "SD", "MD", "DRAW"].includes(method)) {
      const top = rounds * 10;
      const cards: [number, number][] =
        method === "UD" ? [[top - 3, top - 7], [top - 4, top - 6], [top - 2, top - 8]]
        : method === "SD" ? [[top - 5, top - 5 - 0 + 0 - 1 + 1], [top - 4, top - 6], [top - 6, top - 4]]
        : method === "MD" ? [[top - 5, top - 5], [top - 4, top - 6], [top - 4, top - 6]]
        : [[top - 4, top - 6], [top - 6, top - 4], [top - 5, top - 5]];
      if (method === "SD") cards[0] = [top - 4, top - 6];
      await db.scorecard.createMany({ data: cards.map(([sa, sb], i) => ({ fightId: f.id, judge: ["Judge A. Bello (demo)", "Judge M. Okafor (demo)", "Judge S. Mensah (demo)"][i], scoreA: res === "B" ? sb : sa, scoreB: res === "B" ? sa : sb })) });
    }
    // Round-by-round punch stats for main events (demo values, flagged by source)
    if (done && position === "MAIN_EVENT") {
      const last = endRound ?? rounds;
      for (let r = 1; r <= last; r++) {
        for (const [fid, edge] of [[fighter[a], res === "A" ? 4 : 0], [fighter[b], res === "B" ? 4 : 0]] as const) {
          const jabsThrown = int(18, 34), powerThrown = int(12, 28);
          const jabsLanded = Math.round(jabsThrown * (0.2 + rnd() * 0.15)) + (edge ? 1 : 0);
          const powerLanded = Math.round(powerThrown * (0.28 + rnd() * 0.2)) + (edge ? 2 : 0);
          const bodyLanded = Math.round((jabsLanded + powerLanded) * 0.3);
          await db.fightRoundStat.create({
            data: { fightId: f.id, fighterId: fid, round: r, jabsThrown, jabsLanded, powerThrown, powerLanded, bodyLanded, headLanded: jabsLanded + powerLanded - bodyLanded, knockdowns: method === "KO" && r === last && edge ? 1 : 0, source: "demo" },
          });
        }
      }
    }
  }

  // ── Title reigns (inaugural champions) + rankings
  for (const f of fights.filter((x) => x.done && x.title && x.winner)) {
    const exists = await db.titleReign.findFirst({ where: { divisionId: div[f.division], lostAt: null } });
    if (!exists) {
      const ev = EVENTS.find((e) => e[0] === f.ev)!;
      await db.titleReign.create({ data: { divisionId: div[f.division], fighterId: f.winner!, wonAt: at(ev[4]), wonFightId: f.id, note: "Inaugural champion" } });
    }
  }
  const RANKS: [string, string, number, number | null][] = [
    ["heavyweight", "thabo-mokoena", 1, 1],
    ["cruiserweight", "emeka-uzor", 1, 2], ["cruiserweight", "ikenna-anyanwu", 2, 1],
    ["middleweight", "youssef-benali", 1, 1], ["middleweight", "brian-otieno", 2, 2],
    ["welterweight", "chidubem-nwosu", 1, 2], ["welterweight", "kenechukwu-okoro", 2, 1], ["welterweight", "sizwe-dlamini", 3, 3],
    ["lightweight", "mamadou-diop", 1, 1],
    ["featherweight", "juma-mwakyusa", 1, 1],
    ["bantamweight", "eric-habimana", 1, null],
    ["womens-featherweight", "abena-owusu", 1, 1],
  ];
  await db.ranking.createMany({ data: RANKS.map(([d, f, rank, previousRank]) => ({ divisionId: div[d], fighterId: fighter[f], rank, previousRank })) });

  // ── Users
  const pw = hash(DEMO_PASSWORD);
  const staff: [string, string, string, "SUPER_ADMIN" | "EDITOR" | "EVENT_MANAGER" | "SCOUT" | "JOURNALIST" | "FIGHTER" | "FAN" | "SPONSOR", string][] = [
    ["admin@acl.demo", "ACL Admin", "acl-admin", "SUPER_ADMIN", "NG"],
    ["editor@acl.demo", "Ngozi Adebayo", "ngozi-adebayo", "EDITOR", "NG"],
    ["writer@acl.demo", "Kwame Boateng", "kwame-boateng", "EDITOR", "GH"],
    ["events@acl.demo", "Zanele Khumalo", "zanele-khumalo", "EVENT_MANAGER", "ZA"],
    ["scout@acl.demo", "Ibrahim Sow", "ibrahim-sow", "SCOUT", "SN"],
    ["press@acl.demo", "Amina Yusuf", "amina-yusuf", "JOURNALIST", "KE"],
    ["sponsor@acl.demo", "Partner Account", "partner-demo", "SPONSOR", "NG"],
    ["fighter@acl.demo", "Kenechukwu Okoro", "the-viper", "FIGHTER", "NG"],
    ["fan@acl.demo", "Chioma Fan", "chioma", "FAN", "NG"],
  ];
  const user: Record<string, string> = {};
  for (const [email, name, handle, role, countryCode] of staff) {
    user[email] = (
      await db.user.create({
        data: {
          email, name, handle, role, countryCode, passwordHash: pw, preferences: { create: {} },
          bio: role === "EDITOR" ? `${name} covers African combat sports for ACL Digital.` : null,
          fighterId: role === "FIGHTER" ? fighter["kenechukwu-okoro"] : null,
          premium: email === "fan@acl.demo",
        },
      })
    ).id;
  }
  const FAN_NAMES: [string, string][] = [
    ["Tobi Lawal", "NG"], ["Akosua Darko", "GH"], ["Sipho Zulu", "ZA"], ["Wanjiku Kamau", "KE"], ["Patrick Mugisha", "UG"], ["Fatou Ndiaye", "SN"],
    ["Samuel Eto", "CM"], ["Neema Mollel", "TZ"], ["Jean Uwimana", "RW"], ["Aya Kouassi", "CI"], ["Omar Haddad", "MA"], ["Nour Farouk", "EG"],
    ["Chinedu Obi", "NG"], ["Ama Serwaa", "GH"], ["Thandi Nkosi", "ZA"], ["Uche Nnamdi", "NG"],
  ];
  const fanIds: string[] = [user["fan@acl.demo"]];
  for (const [name, countryCode] of FAN_NAMES) {
    const handle = name.toLowerCase().replace(/\s+/g, "-");
    fanIds.push((await db.user.create({ data: { email: `${handle}@fans.demo`, name, handle, countryCode, passwordHash: pw, preferences: { create: {} } } })).id);
  }

  // ── Badges
  const BADGES: [string, string, string][] = [
    ["first-fight", "First Fight", "Watched your first full fight on ACL Watch."],
    ["first-event", "First Event", "Held a ticket to your first ACL event."],
    ["100-fights-watched", "100 Fights Watched", "Watched one hundred full fights."],
    ["vip-fan", "VIP Fan", "An ACL premium member."],
    ["ringside", "Ringside", "Sat ringside at an ACL event."],
    ["champion-supporter", "Champion Supporter", "Follows three or more reigning champions."],
    ["founding-fan", "Founding Fan", "Joined ACL during its inaugural season."],
    ["acl-original", "ACL Original", "Watched an ACL Originals episode."],
  ];
  await db.badge.createMany({ data: BADGES.map(([slug, name, description]) => ({ slug, name, description })) });
  const founding = await db.badge.findUniqueOrThrow({ where: { slug: "founding-fan" } });
  await db.userBadge.createMany({ data: fanIds.map((userId) => ({ userId, badgeId: founding.id })) });

  // ── Follows, predictions, points (demo engagement)
  const fighterSlugs = Object.keys(fighter);
  const popularity: Record<string, number> = { "kenechukwu-okoro": 0.95, "babajide-adeyemi": 0.8, "adaeze-eze": 0.8, "kwabena-addo": 0.7, "chidubem-nwosu": 0.7, "kofi-asante": 0.5, "thabo-mokoena": 0.5, "moses-ssebunya": 0.4 };
  for (const uid of fanIds) {
    await db.pointEntry.create({ data: { userId: uid, reason: "SIGNUP", refKey: "signup", points: 100 } });
    for (const slug of fighterSlugs) {
      if (rnd() < (popularity[slug] ?? 0.2)) {
        await db.follow.create({ data: { userId: uid, fighterId: fighter[slug], notify: rnd() < 0.5 } });
        await db.pointEntry.create({ data: { userId: uid, reason: "FOLLOW_FIGHTER", refKey: fighter[slug], points: 10 } });
      }
    }
    for (const f of fights) {
      if (rnd() < 0.7) {
        const pickA = rnd() < (f.done ? (f.winner === f.a ? 0.62 : 0.4) : f.slug.startsWith("okoro") ? 0.63 : 0.5);
        const pickId = pickA ? f.a : f.b;
        const correct = f.done ? f.winner === pickId : null;
        await db.prediction.create({ data: { userId: uid, fightId: f.id, pickFighterId: pickId, method: pick(["KO/TKO", "Decision"]), round: null, correct } });
        await db.pointEntry.create({ data: { userId: uid, reason: "PREDICT_FIGHT", refKey: f.id, points: 15 } });
        if (correct) await db.pointEntry.create({ data: { userId: uid, reason: "CORRECT_PREDICTION", refKey: f.id, points: 60 } });
      }
    }
  }

  // ── Tags + articles
  const TAGS = ["State Wars", "Title Fight", "Abia", "Imo", "Rankings", "Knockout", "Tickets", "Welterweight", "Heavyweight", "Women’s Boxing", "Scouting", "Business", "East Africa", "Ghana", "Training"];
  const tag: Record<string, string> = {};
  for (const name of TAGS) tag[name] = (await db.tag.create({ data: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") } })).id;
  type A = [string, string, ArticleCategory, string, string, string[], string[], string | null, boolean, string, string[]];
  const ARTICLES: A[] = [
    ["okoro-vs-nwosu-headlines-state-wars-001", "Okoro vs Nwosu headlines first ACL State Wars in Aba", "FIGHT_ANNOUNCEMENTS", "2026-10-05T09:00:00Z", "The Viper meets the Iron Lion on 28 November as Abia and Imo settle it in the ring.", ["State Wars", "Abia", "Imo", "Welterweight"], ["kenechukwu-okoro", "chidubem-nwosu"], "acl-state-wars-001", true, "editor@acl.demo",
      ["Africa Combat League has confirmed the main event of its first State Wars card: Aba's Kenechukwu “The Viper” Okoro against Owerri's Chidubem “Iron Lion” Nwosu, twelve rounds at welterweight, on Saturday 28 November at the Enyimba Dome.", "The winner becomes mandatory challenger to champion Kwabena Addo. Nwosu, ranked number one, lost a split decision to Addo in Accra in June. Okoro, ranked two, has not fought since stopping Sizwe Dlamini on the league's opening night.", "State Wars is a new series in which fighters represent their home states. Abia and Imo share a border, a language and a long sporting rivalry. Now they share a fight card."]],
    ["state-wars-tickets-on-sale", "State Wars 001 tickets on sale now — ringside nearly gone", "EVENT_NEWS", "2026-10-12T08:00:00Z", "Four ticket categories are available for the Enyimba Dome, starting at ₦5,000.", ["State Wars", "Tickets"], [], "acl-state-wars-001", false, "writer@acl.demo",
      ["Tickets for ACL State Wars 001 are now on general sale through the ACL website. General admission starts at ₦5,000, with Stands, Floor and Ringside categories also available.", "Every ticket is digital. After checkout your tickets appear in your ACL account with a QR code that is scanned at the gate. Ticket holders also get free entry to the Fan Fest on Thursday of fight week."]],
    ["nwosu-we-go-to-aba-to-collect", "Nwosu: “Imo does not go to Aba to visit. We go to collect.”", "INTERVIEWS", "2026-10-20T10:30:00Z", "The number-one contender on the split decision in Accra, the Okoro callout and fighting in enemy territory.", ["State Wars", "Imo", "Welterweight"], ["chidubem-nwosu"], "acl-state-wars-001", true, "editor@acl.demo",
      ["Chidubem Nwosu does not raise his voice. Sitting ringside at Heartland Fight Club in Owerri, the welterweight division's top contender talks about 28 November the way other people talk about a bank appointment.", "“I watched the Accra fight again,” he says of his split-decision defeat to champion Kwabena Addo. “I won seven rounds. But I am not a man who cries about cards. I am a man who makes sure there are no cards next time.”", "On fighting Okoro in Aba: “He thinks the crowd will fight for him. A crowd has never thrown a punch. Imo does not go to Aba to visit. We go to collect.”"]],
    ["okoro-opens-camp-in-aba", "Inside Okoro's camp: 5am roadwork through Ariaria", "TRAINING_CAMP", "2026-10-28T07:00:00Z", "The Viper has moved back into the Enyimba Boxing Academy dormitory for an eight-week camp.", ["Abia", "Training", "State Wars"], ["kenechukwu-okoro"], "acl-state-wars-001", false, "writer@acl.demo",
      ["The shutters of Ariaria International Market are still down when Kenechukwu Okoro runs past them. He used to sell fabric here. Now traders arriving early stop to clap him through.", "Coach Obinna Kalu has built the camp around one idea: cutting off the ring. “Nwosu is a counter-puncher. He wants space and time,” Kalu says. “We are taking both away.”", "Okoro has sparred more than 120 rounds, the majority against orthodox counter-punchers brought in from Lagos and Accra."]],
    ["welterweight-rankings-update-november", "Rankings update: Nwosu takes top welterweight spot", "RANKINGS", "2026-10-01T12:00:00Z", "Movement at 147 and 200 pounds after ACL 003: Highveld.", ["Rankings", "Welterweight"], ["chidubem-nwosu", "kenechukwu-okoro", "emeka-uzor"], null, false, "editor@acl.demo",
      ["The ACL rankings panel has published its post-Highveld update. Chidubem Nwosu rises to number one at welterweight after his fourth-round knockout of Sizwe Dlamini, moving past the inactive Kenechukwu Okoro.", "At cruiserweight, Emeka Uzor's split-decision win over Ikenna Anyanwu lifts him to the top contender position. Anyanwu drops one place.", "Rankings are voted by an independent panel after every event and published on the ACL website."]],
    ["adeyemi-mokoena-rematch-set-for-nairobi", "Adeyemi–Mokoena II to headline ACL's Nairobi debut", "BREAKING_NEWS", "2026-11-09T16:00:00Z", "The heavyweight title rematch is official for 20 February 2027.", ["Heavyweight", "Title Fight", "East Africa"], ["babajide-adeyemi", "thabo-mokoena"], "acl-004-nairobi-nights", true, "editor@acl.demo",
      ["The heavyweight championship of Africa Combat League will be contested in East Africa for the first time. Champion Babajide Adeyemi defends against Thabo Mokoena at ACL 004: Nairobi Nights on Saturday 20 February 2027.", "Adeyemi knocked Mokoena out in the sixth round on the league's opening night in Lagos. Mokoena was ahead on two scorecards at the time.", "Kenyan middleweight Brian Otieno meets Youssef Benali in a rematch in the co-main event."]],
    ["eze-owusu-trilogy-talks", "Eze and Owusu camps open talks on trilogy fight", "FIGHTER_NEWS", "2026-10-15T11:00:00Z", "A stoppage and a split draw. The women's featherweight title picture needs a third fight.", ["Women’s Boxing", "Title Fight"], ["adaeze-eze", "abena-owusu"], null, false, "writer@acl.demo",
      ["Representatives of women's featherweight champion Adaeze Eze and challenger Abena Owusu have opened discussions on a third fight, ACL officials confirmed.", "Eze stopped Owusu in five rounds in Lagos to become the league's first women's champion. Their rematch in Johannesburg ended in a split draw, with Eze retaining the title.", "No date has been agreed. Both camps have indicated a preference for a West African venue."]],
    ["acl-announces-kora-bank-partnership", "ACL signs multi-year partnership (demo announcement)", "BUSINESS", "2026-09-30T09:00:00Z", "A demo business story showing how commercial announcements appear in the newsroom.", ["Business"], [], null, false, "editor@acl.demo",
      ["This is a demonstration article for the Business category. In production, sponsorship and commercial announcements are published here by the ACL editorial team.", "Brands interested in working with Africa Combat League can find audience data and inventory on the Partner with ACL page."]],
    ["how-acl-scouts-fighters", "From application to contract: how ACL scouts fighters", "BEHIND_THE_SCENES", "2026-09-10T09:00:00Z", "The six stages every prospect passes through, explained by the league's scouting team.", ["Scouting"], [], null, false, "editor@acl.demo",
      ["Every ACL fighter starts in the same place: the application form. From there the scouting department runs a six-stage pipeline — application, review, scouting, test, contract and, finally, ACL fighter.", "“We watch every video that is sent to us,” says head scout Ibrahim Sow. “Record matters less than people think. We are looking for habits: balance, discipline, what a fighter does when hurt.”", "Applicants can track their status, medical requirements and documents through the fighter portal."]],
    ["accra-split-decision-revisited", "Scorecards revisited: the Addo–Nwosu split decision", "AFRICAN_COMBAT_SPORTS", "2026-07-02T09:00:00Z", "Round by round through the closest title fight in the league's short history.", ["Ghana", "Title Fight", "Welterweight"], ["kwabena-addo", "chidubem-nwosu"], "acl-002-gold-coast", false, "writer@acl.demo",
      ["Two judges scored it for the champion. One had the challenger ahead. Three weeks on, the welterweight title fight in Accra is still being argued in gyms from Bukom to Owerri.", "Addo's early body work banked rounds. Nwosu's counters took over the middle of the fight. The final three rounds decided it, and they were close enough to score either way.", "Official scorecards for every ACL decision are published on the fight page."]],
    ["highveld-results-asante-retains", "Highveld results: Asante edges Benali, Nwosu and Uzor win", "EVENT_NEWS", "2026-09-20T06:00:00Z", "Everything that happened at ACL 003 in Johannesburg.", ["Title Fight", "Knockout"], ["kofi-asante", "youssef-benali", "chidubem-nwosu", "emeka-uzor"], "acl-003-highveld", false, "writer@acl.demo",
      ["Kofi Asante retained the ACL middleweight title with a majority decision over Morocco's Youssef Benali in the main event of ACL 003: Highveld.", "Chidubem Nwosu produced the knockout of the night, stopping Sizwe Dlamini in the fourth. Emeka Uzor took a split decision over previously unbeaten Ikenna Anyanwu, and Adaeze Eze kept her title after a split draw with Abena Owusu."]],
    ["uzor-anyanwu-rematch-added", "Uzor–Anyanwu rematch added to State Wars as co-main", "FIGHT_ANNOUNCEMENTS", "2026-10-08T09:00:00Z", "Abia vs Imo gets a second chapter at cruiserweight.", ["State Wars", "Abia", "Imo"], ["emeka-uzor", "ikenna-anyanwu"], "acl-state-wars-001", false, "editor@acl.demo",
      ["Emeka Uzor of Aba and Ikenna Anyanwu of Owerri will meet again in the co-main event of ACL State Wars 001.", "Uzor won their first fight by split decision in Johannesburg, a result Anyanwu has publicly disputed. The rematch is scheduled for ten rounds."]],
    ["genesis-recap-four-champions-crowned", "Genesis: four champions crowned on ACL's opening night", "EVENT_NEWS", "2026-03-15T06:00:00Z", "Adeyemi's knockout of Mokoena capped the league's debut in Lagos.", ["Heavyweight", "Knockout", "Title Fight"], ["babajide-adeyemi", "kofi-asante", "karim-mansour", "adaeze-eze"], "acl-001-genesis", false, "editor@acl.demo",
      ["Africa Combat League opened with four championship fights in Lagos and ended with a heavyweight knockout.", "Babajide Adeyemi, behind on two scorecards, stopped Thabo Mokoena with a right hand in the sixth round to become the first ACL heavyweight champion. Kofi Asante, Karim Mansour and Adaeze Eze also won inaugural titles."]],
    ["ssebunya-diop-rematch-preview", "Preview: can Diop solve the Kampala Kid at the second attempt?", "FIGHTER_NEWS", "2026-11-03T09:00:00Z", "The lightweight title rematch lands on the State Wars undercard.", ["Title Fight", "State Wars"], ["moses-ssebunya", "mamadou-diop"], "acl-state-wars-001", false, "writer@acl.demo",
      ["Moses Ssebunya outworked Mamadou Diop over twelve rounds in Accra. Diop's team believes the fight was closer than the cards and that an inside game plan changes everything.", "The rematch is one of two title fights supporting the Abia vs Imo bouts in Aba."]],
    ["nairobi-nights-what-to-know", "Nairobi Nights: what East African fans need to know", "AFRICAN_COMBAT_SPORTS", "2026-11-10T09:00:00Z", "Dates, venue, ticket release and how to watch ACL 004.", ["East Africa", "Tickets"], ["brian-otieno"], "acl-004-nairobi-nights", false, "writer@acl.demo",
      ["ACL 004 takes place at the Savannah Arena in Nairobi on Saturday 20 February 2027. It is the league's first event in East Africa.", "Tickets are priced in Kenyan shillings and are on sale now. Home fighter Brian Otieno features in the co-main event."]],
  ];
  for (const [slug, title, category, publishedAt, excerpt, tags, fs, ev, featured, author, paras] of ARTICLES) {
    await db.article.create({
      data: {
        slug, title, category, excerpt, featured, publishedAt: at(publishedAt), body: paras.join("\n\n"), authorId: user[author], eventId: ev ? event[ev] : null,
        views: int(400, 9000), tags: { connect: tags.map((t) => ({ id: tag[t] })) }, fighters: { connect: fs.map((f) => ({ id: fighter[f] })) },
      },
    });
  }

  // ── Series + videos
  const SERIES: [string, string, string, string][] = [
    ["the-vision", "The Vision", "ACL Original", "Why Africa needed a league of its own — the idea, told by the people who had it."],
    ["the-beginning", "The Beginning", "ACL Original", "Ninety days to opening night. Inside the scramble to stage ACL 001."],
    ["the-foundation", "The Foundation", "ACL Original", "The gyms, coaches and communities the league is built on."],
    ["the-struggle", "The Struggle", "ACL Original", "What it really costs to become a professional fighter in Africa."],
    ["the-viper", "The Viper", "Fighter documentary", "From Ariaria Market to main event: the Kenechukwu Okoro story."],
    ["the-oriental-war", "The Oriental War", "Rivalry documentary", "Abia. Imo. A border, a rivalry and a fight card."],
  ];
  const series: Record<string, string> = {};
  for (const [i, [slug, title, kind, description]] of SERIES.entries()) series[slug] = (await db.series.create({ data: { slug, title, kind, description, sortOrder: i } })).id;
  const fightBySlug = (s: string) => fights.find((f) => f.slug === s)!.id;
  type V = [string, string, VideoCategory, number, string, string, string | null, string | null, string[], string | null, boolean];
  const VIDEOS: V[] = [
    ["state-wars-001-official-trailer", "State Wars 001: Abia vs Imo — Official Trailer", "SHORT_CLIPS", 92, "2026-10-06T09:00:00Z", "Two states. One ring. 28 November, Aba.", "acl-state-wars-001", null, ["kenechukwu-okoro", "chidubem-nwosu"], null, false],
    ["okoro-nwosu-first-face-off", "Okoro vs Nwosu: First Face-Off", "FACE_OFFS", 187, "2026-10-07T09:00:00Z", "Security steps in as the welterweight rivals meet for the first time since the fight was signed.", "acl-state-wars-001", "okoro-vs-nwosu", ["kenechukwu-okoro", "chidubem-nwosu"], null, false],
    ["state-wars-launch-press-conference", "State Wars 001: Launch Press Conference", "PRESS_CONFERENCES", 2710, "2026-10-06T14:00:00Z", "The full launch press conference from Lagos.", "acl-state-wars-001", null, ["kenechukwu-okoro", "chidubem-nwosu", "emeka-uzor", "ikenna-anyanwu"], null, false],
    ["adeyemi-vs-mokoena-full-fight", "Adeyemi vs Mokoena — Full Fight", "FULL_FIGHTS", 1620, "2026-03-20T09:00:00Z", "The first ACL heavyweight title fight in full.", "acl-001-genesis", "adeyemi-vs-mokoena", ["babajide-adeyemi", "thabo-mokoena"], null, true],
    ["adeyemi-ko-mokoena-highlights", "Adeyemi KO6 Mokoena — Highlights", "HIGHLIGHTS", 214, "2026-03-15T09:00:00Z", "One right hand changes everything in Lagos.", "acl-001-genesis", "adeyemi-vs-mokoena", ["babajide-adeyemi", "thabo-mokoena"], null, false],
    ["addo-vs-nwosu-full-fight", "Addo vs Nwosu — Full Fight", "FULL_FIGHTS", 2890, "2026-06-27T09:00:00Z", "Twelve rounds, three judges, one split decision.", "acl-002-gold-coast", "addo-vs-nwosu", ["kwabena-addo", "chidubem-nwosu"], null, true],
    ["addo-vs-nwosu-highlights", "Addo vs Nwosu — Highlights", "HIGHLIGHTS", 301, "2026-06-21T09:00:00Z", "The closest title fight of the season.", "acl-002-gold-coast", "addo-vs-nwosu", ["kwabena-addo", "chidubem-nwosu"], null, false],
    ["nwosu-ko-dlamini-highlights", "Nwosu KO4 Dlamini — Highlights", "HIGHLIGHTS", 176, "2026-09-20T09:00:00Z", "The counter left hook that made Nwosu number one.", "acl-003-highveld", "nwosu-vs-dlamini", ["chidubem-nwosu", "sizwe-dlamini"], null, false],
    ["okoro-vs-dlamini-full-fight", "Okoro vs Dlamini — Full Fight", "FULL_FIGHTS", 1905, "2026-03-21T09:00:00Z", "The Viper's ACL debut.", "acl-001-genesis", "okoro-vs-dlamini", ["kenechukwu-okoro", "sizwe-dlamini"], null, true],
    ["asante-vs-benali-highlights", "Asante vs Benali — Highlights", "HIGHLIGHTS", 288, "2026-09-20T10:00:00Z", "The champion survives his toughest night.", "acl-003-highveld", "asante-vs-benali", ["kofi-asante", "youssef-benali"], null, false],
    ["eze-post-fight-interview-highveld", "Adaeze Eze: “Run it back for the third time”", "INTERVIEWS", 342, "2026-09-19T22:00:00Z", "The champion reacts to the split draw in Johannesburg.", "acl-003-highveld", "eze-vs-owusu-2", ["adaeze-eze"], null, false],
    ["nwosu-sit-down-interview", "Chidubem Nwosu: The Sit-Down", "INTERVIEWS", 1145, "2026-10-21T09:00:00Z", "The Iron Lion on Accra, Okoro and Owerri.", null, null, ["chidubem-nwosu"], null, false],
    ["highveld-weigh-in", "ACL 003: Highveld — Official Weigh-In", "WEIGH_INS", 1980, "2026-09-18T13:00:00Z", "All eight fighters on the scale in Johannesburg.", "acl-003-highveld", null, ["kofi-asante", "youssef-benali"], null, false],
    ["okoro-camp-day-in-the-life", "Camp Life: A Day With The Viper", "TRAINING_CAMP", 612, "2026-10-29T09:00:00Z", "Roadwork, pads, sparring and a market-stall lunch.", "acl-state-wars-001", null, ["kenechukwu-okoro"], null, false],
    ["genesis-fight-week-all-access", "Genesis Fight Week: All Access", "BEHIND_THE_SCENES", 1503, "2026-03-13T09:00:00Z", "Behind the curtain as the league stages its first event.", "acl-001-genesis", null, ["babajide-adeyemi", "adaeze-eze"], null, false],
    ["the-vision-episode-1", "The Vision", "DOCUMENTARY", 1688, "2026-02-01T09:00:00Z", "Why Africa needed a league of its own.", null, null, [], "the-vision", true],
    ["the-beginning-episode-1", "The Beginning", "DOCUMENTARY", 1754, "2026-04-01T09:00:00Z", "Ninety days to opening night.", "acl-001-genesis", null, [], "the-beginning", true],
    ["the-foundation-episode-1", "The Foundation", "DOCUMENTARY", 1810, "2026-07-01T09:00:00Z", "The gyms the league is built on, from Bukom to Soweto.", null, null, ["kofi-asante"], "the-foundation", true],
    ["the-struggle-episode-1", "The Struggle", "DOCUMENTARY", 1922, "2026-10-01T09:00:00Z", "What it costs to become a professional fighter.", null, null, ["eric-habimana", "juma-mwakyusa"], "the-struggle", true],
    ["the-viper-documentary", "The Viper: Made in Aba", "DOCUMENTARY", 2460, "2026-11-01T09:00:00Z", "From Ariaria Market to main event.", null, null, ["kenechukwu-okoro"], "the-viper", false],
  ];
  const video: Record<string, string> = {};
  for (const [slug, title, category, durationSec, publishedAt, description, ev, f, fs, s, premium] of VIDEOS) {
    video[slug] = (
      await db.video.create({
        data: {
          slug, title, category, durationSec, description, premium, publishedAt: at(publishedAt), views: int(1500, 90000),
          eventId: ev ? event[ev] : null, fightId: f ? fightBySlug(f) : null, seriesId: s ? series[s] : null, episode: s ? 1 : null,
          fighters: { connect: fs.map((x) => ({ id: fighter[x] })) },
        },
      })
    ).id;
  }
  for (const uid of fanIds.slice(0, 9)) {
    for (const slug of Object.keys(video)) if (rnd() < 0.3) await db.videoView.create({ data: { userId: uid, videoId: video[slug] } });
  }

  // ── Rivalries
  const r1 = await db.rivalry.create({
    data: {
      slug: "okoro-vs-nwosu", type: "FIGHTER", title: "Okoro vs Nwosu", tagline: "The Viper. The Iron Lion. Forty-five minutes of road between them.", featured: true,
      sideA: "Kenechukwu Okoro", sideB: "Chidubem Nwosu", fighterAId: fighter["kenechukwu-okoro"], fighterBId: fighter["chidubem-nwosu"], eventId: event["acl-state-wars-001"], fightId: fightBySlug("okoro-vs-nwosu"),
      origin: "They came up through rival gyms an hour apart, met twice as amateurs and split the results. When Nwosu was given the first title shot in Accra, Okoro said publicly that the league had picked the wrong man. Nwosu has not forgiven it.",
    },
  });
  const MOMENTS: [string, string, string, string, string | null, string | null][] = [
    ["2026-01-22T12:00:00Z", "Confrontation", "First confrontation", "At the ACL launch event in Lagos the two are separated after Okoro interrupts Nwosu's interview.", null, null],
    ["2026-03-14T21:00:00Z", "Callout", "The callout", "“Give me the one from Owerri. Let us settle the East.”", "Kenechukwu Okoro, after stopping Dlamini at ACL 001", null],
    ["2026-06-20T22:00:00Z", "Quote", "Nwosu loses the split decision", "“If Okoro thinks I am the wrong man, he knows where Owerri is.”", "Chidubem Nwosu, post-fight in Accra", "addo-vs-nwosu-highlights"],
    ["2026-09-25T10:00:00Z", "Contract", "Contracts signed", "Both camps sign for a twelve-round title eliminator. The league confirms it will headline a new regional series.", null, null],
    ["2026-10-06T12:00:00Z", "Face-off", "The face-off", "Security steps between them at the launch press conference.", null, "okoro-nwosu-first-face-off"],
    ["2026-10-06T14:00:00Z", "Announcement", "Fight announced", "ACL State Wars 001: Abia vs Imo is made official for the Enyimba Dome.", null, "state-wars-001-official-trailer"],
    ["2026-11-28T18:00:00Z", "Fight night", "Fight night", "The Oriental War. Aba.", null, null],
  ];
  await db.rivalryMoment.createMany({ data: MOMENTS.map(([date, kind, title, body, quoteBy, v]) => ({ rivalryId: r1.id, date: at(date), kind, title, body, quoteBy, videoId: v ? video[v] : null })) });
  const r2 = await db.rivalry.create({
    data: {
      slug: "adeyemi-vs-mokoena", type: "FIGHTER", title: "Adeyemi vs Mokoena", tagline: "One punch settled the first fight. It settled nothing else.",
      sideA: "Babajide Adeyemi", sideB: "Thabo Mokoena", fighterAId: fighter["babajide-adeyemi"], fighterBId: fighter["thabo-mokoena"], eventId: event["acl-004-nairobi-nights"], fightId: fightBySlug("adeyemi-vs-mokoena-2"),
      origin: "Mokoena was winning the first heavyweight title fight in league history until Adeyemi's right hand landed in round six. Lagos calls it destiny. Johannesburg calls it luck.",
    },
  });
  await db.rivalryMoment.createMany({
    data: [
      { rivalryId: r2.id, date: at("2026-03-14T22:00:00Z"), kind: "Fight night", title: "Adeyemi KO6 Mokoena", body: "Behind on two cards, Adeyemi ends it with one right hand to win the inaugural title.", videoId: video["adeyemi-ko-mokoena-highlights"] },
      { rivalryId: r2.id, date: at("2026-03-15T09:00:00Z"), kind: "Quote", title: "“Check the scorecards”", body: "“He was losing every minute of that fight except the last one.”", quoteBy: "Thabo Mokoena" },
      { rivalryId: r2.id, date: at("2026-11-09T16:00:00Z"), kind: "Announcement", title: "Rematch announced", body: "The rematch is confirmed as the main event of ACL 004 in Nairobi." },
      { rivalryId: r2.id, date: at("2027-02-20T17:00:00Z"), kind: "Fight night", title: "Nairobi Nights", body: "Adeyemi vs Mokoena II for the ACL heavyweight championship." },
    ],
  });
  const r3 = await db.rivalry.create({
    data: {
      slug: "eze-vs-owusu", type: "FIGHTER", title: "Eze vs Owusu", tagline: "A stoppage. A draw. Unfinished.",
      sideA: "Adaeze Eze", sideB: "Abena Owusu", fighterAId: fighter["adaeze-eze"], fighterBId: fighter["abena-owusu"],
      origin: "Nigeria against Ghana, orthodox against southpaw, and two fights that answered nothing. Eze stopped Owusu in Lagos; Owusu held her to a split draw in Johannesburg.",
    },
  });
  await db.rivalryMoment.createMany({
    data: [
      { rivalryId: r3.id, date: at("2026-03-14T19:00:00Z"), kind: "Fight night", title: "Eze TKO5 Owusu", body: "Eze becomes the league's first women's champion." },
      { rivalryId: r3.id, date: at("2026-09-19T18:00:00Z"), kind: "Fight night", title: "Split draw in Johannesburg", body: "One card each and one level. Eze retains.", videoId: video["eze-post-fight-interview-highveld"] },
      { rivalryId: r3.id, date: at("2026-10-15T11:00:00Z"), kind: "Announcement", title: "Trilogy talks open", body: "Both camps confirm negotiations for a third fight." },
    ],
  });
  const r4 = await db.rivalry.create({
    data: {
      slug: "abia-vs-imo", type: "REGION", title: "Abia vs Imo", tagline: "The Oriental War", featured: true, sideA: "Abia", sideB: "Imo", eventId: event["acl-state-wars-001"],
      origin: "Aba and Owerri sit forty-five minutes apart on the same road. Abia has the market, Imo has the capital, and both claim the better fighters. State Wars 001 puts two Abia fighters against two from Imo — the state with more wins on the night takes the first State Wars shield.",
    },
  });
  await db.rivalryMoment.createMany({
    data: [
      { rivalryId: r4.id, date: at("2026-09-19T19:00:00Z"), kind: "Fight night", title: "Uzor edges Anyanwu", body: "Abia's Emeka Uzor takes a split decision over Imo's Ikenna Anyanwu in Johannesburg. Imo disputes the cards." },
      { rivalryId: r4.id, date: at("2026-10-06T14:00:00Z"), kind: "Announcement", title: "State Wars announced", body: "ACL launches its regional series with Abia vs Imo." },
      { rivalryId: r4.id, date: at("2026-11-24T12:00:00Z"), kind: "Face-off", title: "Press conference in Owerri", body: "Abia's fighters travel to Imo's capital for the final press conference." },
      { rivalryId: r4.id, date: at("2026-11-28T18:00:00Z"), kind: "Fight night", title: "The Oriental War", body: "Enyimba Dome, Aba." },
    ],
  });
  const r5 = await db.rivalry.create({
    data: {
      slug: "ghana-vs-nigeria", type: "REGION", title: "Ghana vs Nigeria", tagline: "The jollof derby, with gloves on.", sideA: "Ghana", sideB: "Nigeria",
      origin: "West Africa's oldest sporting argument now has a combat-sports chapter. Ghanaian champions hold the welterweight and middleweight belts; Nigerian contenders are lined up for both. Head-to-head ACL results between the two nations are tracked here.",
    },
  });
  await db.rivalryMoment.createMany({
    data: [
      { rivalryId: r5.id, date: at("2026-03-14T19:00:00Z"), kind: "Fight night", title: "Eze stops Owusu", body: "Nigeria 1–0 Ghana." },
      { rivalryId: r5.id, date: at("2026-06-20T22:00:00Z"), kind: "Fight night", title: "Addo edges Nwosu", body: "Ghana levels it by split decision in Accra. 1–1." },
      { rivalryId: r5.id, date: at("2026-09-19T18:00:00Z"), kind: "Fight night", title: "Eze–Owusu II: draw", body: "Still level." },
    ],
  });
  for (const uid of fanIds) {
    for (const r of [r1, r2, r3, r4, r5]) if (rnd() < 0.8) await db.rivalryVote.create({ data: { rivalryId: r.id, userId: uid, side: rnd() < 0.58 ? "A" : "B" } });
  }

  // ── Tickets, products, promo
  const TT: [string, string, string, string, number, string, number][] = [
    ["acl-state-wars-001", "General Admission", "Upper Bowl", "Unreserved seating in the upper bowl.", 500000, "NGN", 3000],
    ["acl-state-wars-001", "Stands", "Lower Bowl", "Reserved seat in the lower bowl.", 1500000, "NGN", 1500],
    ["acl-state-wars-001", "Floor", "Floor", "Reserved floor seat, rows 6–20.", 4000000, "NGN", 400],
    ["acl-state-wars-001", "Ringside", "Ringside", "Rows 1–5 with hospitality lounge access.", 12000000, "NGN", 12],
    ["acl-004-nairobi-nights", "General Admission", "Upper Bowl", "Unreserved seating.", 150000, "KES", 2500],
    ["acl-004-nairobi-nights", "Stands", "Lower Bowl", "Reserved seat in the lower bowl.", 400000, "KES", 1200],
    ["acl-004-nairobi-nights", "Ringside", "Ringside", "Rows 1–5 with hospitality.", 2500000, "KES", 80],
  ];
  for (const [i, [ev, name, section, description, priceMinor, currency, capacity]] of TT.entries()) {
    await db.ticketType.create({ data: { eventId: event[ev], name, section, description, priceMinor, currency, capacity, sortOrder: i } });
  }
  const SIZES = ["S", "M", "L", "XL", "XXL"];
  const PRODUCTS: [string, string, "SHIRTS" | "HOODIES" | "CAPS" | "FIGHTER" | "EVENT" | "CHAMPIONSHIP" | "GYM" | "LIMITED", number, string[], number, boolean, string | null, string | null, string][] = [
    ["acl-crest-tee-black", "ACL Crest Tee — Black", "SHIRTS", 2500, SIZES, 240, false, null, null, "Heavyweight cotton tee with the ACL crest in red and gold."],
    ["acl-crest-tee-white", "ACL Crest Tee — White", "SHIRTS", 2500, SIZES, 180, false, null, null, "The crest tee in white with black and red print."],
    ["acl-fight-night-hoodie", "ACL Fight Night Hoodie", "HOODIES", 5500, SIZES, 120, false, null, null, "Brushed-fleece pullover hoodie. Embroidered crest, gold drawcord tips."],
    ["acl-corner-cap", "ACL Corner Cap", "CAPS", 2000, [], 300, false, null, null, "Structured six-panel cap as worn by ACL corner teams."],
    ["the-viper-tee", "The Viper Tee — Okoro", "FIGHTER", 3000, SIZES, 150, false, "kenechukwu-okoro", null, "Official Kenechukwu Okoro walkout tee. A share of every sale goes to the fighter."],
    ["the-mountain-tee", "The Mountain Tee — Adeyemi", "FIGHTER", 3000, SIZES, 90, false, "babajide-adeyemi", null, "Official Babajide Adeyemi champion's tee."],
    ["queen-cobra-tee", "Queen Cobra Tee — Eze", "FIGHTER", 3000, SIZES, 110, false, "adaeze-eze", null, "Official Adaeze Eze champion's tee."],
    ["state-wars-001-event-tee", "State Wars 001 Event Tee", "EVENT", 2800, SIZES, 400, false, null, "acl-state-wars-001", "Abia vs Imo fight card on the back. Available in Abia green or Imo blue trim."],
    ["champions-gold-hoodie", "Champions Gold Hoodie", "CHAMPIONSHIP", 6500, SIZES, 60, false, null, null, "Black hoodie with metallic gold championship belt artwork."],
    ["enyimba-academy-tee", "Enyimba Boxing Academy Tee", "GYM", 2400, SIZES, 75, false, null, null, "Official gym tee from Aba's fight factory."],
    ["genesis-numbered-poster", "Genesis Numbered Poster (1 of 500)", "LIMITED", 4500, [], 37, true, null, "acl-001-genesis", "Individually numbered A2 lithograph of the ACL 001 poster."],
    ["founders-jacket", "Founders Season Jacket", "LIMITED", 12000, ["M", "L", "XL"], 0, true, null, null, "Satin bomber produced once for the inaugural season. Sold out."],
  ];
  for (const [slug, name, category, priceMinor, sizes, inventory, limited, f, ev, description] of PRODUCTS) {
    await db.product.create({ data: { slug, name, category, priceMinor, sizes, inventory, limited, description, fighterId: f ? fighter[f] : null, eventId: ev ? event[ev] : null } });
  }
  await db.promoCode.createMany({ data: [{ code: "ACL10", percentOff: 10 }, { code: "STATEWARS", percentOff: 15, maxUses: 500 }] });

  // ── Media center
  await db.mediaAsset.createMany({
    data: [
      { title: "ACL State Wars 001 — fight card announcement", kind: "PRESS_RELEASE", description: "Official release confirming the four-fight card.", eventId: event["acl-state-wars-001"], publishedAt: at("2026-10-06T14:00:00Z"), body: "FOR IMMEDIATE RELEASE\n\nAfrica Combat League today confirmed the full card for ACL State Wars 001: Abia vs Imo, taking place on Saturday 28 November 2026 at the Enyimba Dome, Aba.\n\nThe main event is a twelve-round welterweight title eliminator between Kenechukwu Okoro (Abia) and Chidubem Nwosu (Imo).\n\nMedia accreditation requests should be sent to the ACL press office. (Demo press release.)" },
      { title: "ACL 004: Nairobi Nights — heavyweight title rematch confirmed", kind: "PRESS_RELEASE", description: "Adeyemi vs Mokoena II headlines the league's East African debut.", eventId: event["acl-004-nairobi-nights"], publishedAt: at("2026-11-09T16:00:00Z"), body: "FOR IMMEDIATE RELEASE\n\nACL heavyweight champion Babajide Adeyemi will defend his title against Thabo Mokoena on Saturday 20 February 2027 at the Savannah Arena, Nairobi. (Demo press release.)" },
      { title: "ACL brand logos", kind: "LOGO", description: "Primary crest and wordmark in SVG, on dark and light backgrounds.", fileUrl: "/api/v1/media/assets/logo" },
      { title: "ACL media kit 2026", kind: "MEDIA_KIT", description: "League overview, key facts, leadership and brand guidelines.", fileUrl: "/api/v1/media/assets/media-kit" },
      { title: "Fighter biographies", kind: "FIGHTER_BIOS", description: "Biographies and vital statistics for the full ACL roster, generated from the fighter database.", fileUrl: "/api/v1/media/assets/fighter-bios" },
      { title: "Official results & statistics", kind: "STATISTICS", description: "Every ACL result with method, round and time as CSV.", fileUrl: "/api/v1/media/assets/results" },
      { title: "State Wars 001 fight card", kind: "FIGHT_CARD", description: "Official bout sheet for accredited media.", eventId: event["acl-state-wars-001"], fileUrl: "/api/v1/media/assets/fight-card?event=acl-state-wars-001" },
    ],
  });

  // ── Community
  const poll = await db.poll.create({ data: { question: "Which State Wars should ACL stage next?", options: { create: [{ label: "Lagos vs Abuja" }, { label: "Aba vs Owerri II" }, { label: "Accra vs Kumasi" }, { label: "Johannesburg vs Durban" }] } }, include: { options: true } });
  for (const uid of fanIds) if (rnd() < 0.85) await db.pollVote.create({ data: { pollId: poll.id, userId: uid, optionId: pick(poll.options).id } });
  const poll2 = await db.poll.create({ data: { question: "Knockout of the season so far?", options: { create: [{ label: "Adeyemi KO6 Mokoena" }, { label: "Nwosu KO4 Dlamini" }, { label: "Benali KO3 Otieno" }] } }, include: { options: true } });
  for (const uid of fanIds) if (rnd() < 0.7) await db.pollVote.create({ data: { pollId: poll2.id, userId: uid, optionId: pick(poll2.options).id } });
  const THREADS: [string, string, "DISCUSSION" | "FIGHTER_QA" | "EVENT" | "FAN_CLUB", string | null, string | null, boolean, string[]][] = [
    ["State Wars 001 — official discussion thread", "Predictions, travel plans and fight-week talk for Abia vs Imo. Keep it respectful.", "EVENT", "acl-state-wars-001", null, true, ["Okoro by late stoppage. The pressure is too much over twelve.", "Nwosu counters southpaws all day. Imo by decision.", "Anyone travelling from Port Harcourt? Looking to share a bus.", "The undercard is underrated. Ssebunya–Diop II could steal the show."]],
    ["Ask The Viper — fighter Q&A", "Kenechukwu Okoro will answer selected questions from this thread during fight week.", "FIGHTER_QA", null, "kenechukwu-okoro", false, ["What do you eat on weigh-in day?", "Who hit you the hardest in your career?", "Will you fight Addo in Accra or do you want him in Aba?"]],
    ["Was Addo–Nwosu the right decision?", "Rewatched it twice. I still cannot split them. What did you have?", "DISCUSSION", "acl-002-gold-coast", null, false, ["7–5 Addo for me. The body work early was the difference.", "Nwosu won the second half clearly. Draw would have been fair."]],
    ["Owerri Iron Lions — Nwosu fan club", "Home for Imo fans. Match-day meetups, travel groups and banners.", "FAN_CLUB", null, "chidubem-nwosu", false, ["Convoy leaves Owerri at 1pm on the 28th.", "Who is printing the shirts?"]],
  ];
  for (const [i, [title, body, category, ev, f, pinned, posts]] of THREADS.entries()) {
    await db.thread.create({
      data: {
        title, body, category, pinned, eventId: ev ? event[ev] : null, fighterId: f ? fighter[f] : null, authorId: i < 2 ? user["editor@acl.demo"] : fanIds[i + 1],
        createdAt: at(`2026-11-0${i + 2}T10:00:00Z`),
        posts: { create: posts.map((b, j) => ({ body: b, authorId: fanIds[(i * 3 + j + 1) % fanIds.length], createdAt: at(`2026-11-0${i + 2}T1${j}:30:00Z`) })) },
      },
    });
  }

  // ── Scouting applications
  const APPS: [string, string, "APPLICATION" | "REVIEW" | "SCOUTING" | "TEST" | "CONTRACT", string, string, number, number, number, [number, number, number]][] = [
    ["fan@acl.demo", "Chioma Fan", "REVIEW", "NG", "Enugu", 60, 168, 170, [4, 0, 0]],
    ["tobi-lawal@fans.demo", "Tobi Lawal", "SCOUTING", "NG", "Ibadan", 72, 181, 186, [6, 1, 0]],
    ["patrick-mugisha@fans.demo", "Patrick Mugisha", "TEST", "UG", "Kampala", 66, 176, 180, [8, 0, 1]],
    ["akosua-darko@fans.demo", "Akosua Darko", "APPLICATION", "GH", "Tamale", 57, 165, 167, [2, 0, 0]],
    ["sipho-zulu@fans.demo", "Sipho Zulu", "CONTRACT", "ZA", "Pretoria", 90, 188, 194, [9, 1, 0]],
  ];
  for (const [email, fullName, status, countryCode, city, weightKg, heightCm, reachCm, [wins, losses, draws]] of APPS) {
    const u = await db.user.findUniqueOrThrow({ where: { email } });
    await db.application.create({
      data: {
        userId: u.id, status, fullName, dateOfBirth: at("2001-05-05T00:00:00Z"), countryCode, city, weightKg, heightCm, reachCm, stance: "ORTHODOX", wins, losses, draws,
        gymName: "Independent", coachName: "Self-trained", experience: "Amateur background with regional titles; recent professional bouts on local cards. (Demo application.)",
        videoLinks: ["https://example.com/demo-fight-video"], photoLinks: [], phone: "+000 000 0000", email,
        documentsReceived: status !== "APPLICATION", medicalCleared: status === "TEST" || status === "CONTRACT", contractStatus: status === "CONTRACT" ? "Issued — awaiting signature" : "Not issued",
        messages: { create: [{ body: "Thank you for applying to Africa Combat League. Your application has been received and will be reviewed by our scouting team.", fromStaff: true }] },
      },
    });
  }

  // ── Notifications for the demo fan
  await db.notification.createMany({
    data: [
      { userId: user["fan@acl.demo"], type: "FIGHT_ANNOUNCEMENT", title: "Okoro vs Nwosu is official", body: "The Viper headlines State Wars 001 on 28 November.", url: "/fights/okoro-vs-nwosu", createdAt: at("2026-10-06T14:05:00Z") },
      { userId: user["fan@acl.demo"], type: "TICKET_RELEASE", title: "State Wars 001 tickets are on sale", body: "From ₦5,000. Ringside is limited.", url: "/events/acl-state-wars-001/tickets", createdAt: at("2026-10-12T08:05:00Z") },
      { userId: user["fan@acl.demo"], type: "NEW_VIDEO", title: "New: The Viper — Made in Aba", body: "The Kenechukwu Okoro documentary is now on ACL Watch.", url: "/watch/the-viper-documentary", createdAt: at("2026-11-01T09:05:00Z") },
      { userId: user["fan@acl.demo"], type: "BREAKING_NEWS", title: "Adeyemi–Mokoena II set for Nairobi", body: "The heavyweight title rematch headlines ACL 004.", url: "/news/adeyemi-mokoena-rematch-set-for-nairobi", createdAt: at("2026-11-09T16:05:00Z") },
    ],
  });

  // ── Demo analytics traffic (last 30 days) so the executive dashboard has shape
  const paths: [string, string | null, string | null, number][] = [
    ["/", null, null, 30], ["/events/acl-state-wars-001", "event", event["acl-state-wars-001"], 16], ["/fighters/kenechukwu-okoro", "fighter", fighter["kenechukwu-okoro"], 12],
    ["/fighters/chidubem-nwosu", "fighter", fighter["chidubem-nwosu"], 7], ["/rankings", null, null, 8], ["/watch", null, null, 8], ["/news", null, null, 6],
    ["/fights/okoro-vs-nwosu", "fight", fightBySlug("okoro-vs-nwosu"), 9], ["/shop", null, null, 5], ["/shop/the-viper-tee", "product", null, 3], ["/champions", null, null, 4], ["/fighters/adaeze-eze", "fighter", fighter["adaeze-eze"], 4],
  ];
  const weighted = paths.flatMap((p) => Array.from({ length: p[3] }, () => p));
  const geo = ["NG", "NG", "NG", "NG", "NG", "GH", "GH", "ZA", "ZA", "KE", "KE", "CM", "UG", "TZ", "SN", "CI", "RW", "GB", "US"];
  const sources = ["direct", "direct", "direct", "google", "google", "whatsapp", "whatsapp", "instagram", "x.com", "tiktok", "facebook", "youtube"];
  const analytics = [];
  const now = Date.now();
  for (let i = 0; i < 6000; i++) {
    const daysAgo = Math.floor(Math.pow(rnd(), 1.6) * 30);
    const [path, entityType, entityId] = pick(weighted);
    analytics.push({ type: "page_view", path, entityType, entityId, visitorId: `demo-${int(1, 1800)}`, country: pick(geo), source: pick(sources), createdAt: new Date(now - daysAgo * 864e5 - int(0, 86399) * 1000) });
  }
  for (let i = 0; i < 900; i++) {
    const v = pick(Object.values(video));
    const createdAt = new Date(now - int(0, 29) * 864e5 - int(0, 86399) * 1000);
    analytics.push({ type: "video_view", entityType: "video", entityId: v, visitorId: `demo-${int(1, 1800)}`, country: pick(geo), source: pick(sources), createdAt });
    analytics.push({ type: "video_watch", entityType: "video", entityId: v, valueMinor: int(30, 900), country: pick(geo), createdAt });
  }
  for (let i = 0; i < 140; i++) analytics.push({ type: "share", path: pick(weighted)[0], source: pick(["whatsapp", "x", "facebook", "copy"]), country: pick(geo), createdAt: new Date(now - int(0, 29) * 864e5) });
  await db.analyticsEvent.createMany({ data: analytics });

  await db.auditLog.create({ data: { userId: user["admin@acl.demo"], action: "seed", resource: "database", detail: "Demo data loaded" } });

  console.log(`Seeded demo world: ${FIGHTERS.length} fighters, ${EVENTS.length} fight nights, ${FIGHTS.length} fights, ${DIVS.length} divisions, ${ARTICLES.length} articles, ${VIDEOS.length} videos, ${GYMS.length} gyms, 5 rivalries.`);
  console.log(`Demo accounts (password "${DEMO_PASSWORD}"): admin@acl.demo, editor@acl.demo, events@acl.demo, scout@acl.demo, press@acl.demo, fighter@acl.demo, fan@acl.demo`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
