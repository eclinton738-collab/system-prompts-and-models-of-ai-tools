export const ARTICLE_CATEGORIES = ["BREAKING_NEWS", "FIGHT_ANNOUNCEMENTS", "FIGHTER_NEWS", "RANKINGS", "INTERVIEWS", "TRAINING_CAMP", "EVENT_NEWS", "BUSINESS", "AFRICAN_COMBAT_SPORTS", "BEHIND_THE_SCENES"] as const;
export const VIDEO_CATEGORIES = ["LIVE", "FULL_FIGHTS", "HIGHLIGHTS", "INTERVIEWS", "PRESS_CONFERENCES", "FACE_OFFS", "WEIGH_INS", "TRAINING_CAMP", "DOCUMENTARY", "BEHIND_THE_SCENES", "SHORT_CLIPS"] as const;
export const toParam = (c: string) => c.toLowerCase().replace(/_/g, "-");
export const fromParam = <T extends readonly string[]>(list: T, p: string): T[number] | null => list.find((c) => toParam(c) === p) ?? null;
