/**
 * The full ACL sitemap. Header, footer, mobile menu, "Coming soon" pages and
 * sitemap.xml are all generated from this tree. Labels live in i18n messages
 * under `nav.<key>` so they can be translated.
 */
export type SiteNode = {
  key: string;
  path: string;
  /** Shown in the desktop header bar. Everything else sits under "More". */
  primary?: boolean;
  children?: SiteNode[];
};

export const siteTree: SiteNode[] = [
  {
    key: "events",
    path: "/events",
    primary: true,
    children: [
      { key: "events_upcoming", path: "/events/upcoming" },
      { key: "events_past", path: "/events/past" },
      {
        key: "events_series",
        path: "/events/series",
        children: [
          { key: "series_state_wars", path: "/events/series/state-wars" },
          { key: "series_lions_den_fight_night", path: "/events/series/lions-den-fight-night" },
        ],
      },
    ],
  },
  { key: "tickets", path: "/tickets", primary: true },
  {
    key: "watch",
    path: "/watch",
    primary: true,
    children: [
      { key: "watch_acl_tv", path: "/watch/acl-tv" },
      { key: "watch_how_to", path: "/watch/how-to-watch" },
      { key: "watch_replays", path: "/watch/replays" },
      { key: "watch_parties", path: "/watch/watch-parties" },
    ],
  },
  {
    key: "fighters",
    path: "/fighters",
    primary: true,
    children: [
      { key: "fighters_all", path: "/fighters/all" },
      { key: "fighters_champions", path: "/fighters/champions" },
      { key: "fighters_rankings", path: "/fighters/rankings" },
      { key: "fighters_hall_of_fame", path: "/fighters/hall-of-fame" },
      { key: "fighters_record_book", path: "/fighters/record-book" },
    ],
  },
  { key: "road_to_acl", path: "/road-to-acl", primary: true },
  { key: "states", path: "/states", primary: true },
  { key: "lions_den", path: "/lions-den", primary: true },
  { key: "news", path: "/news", primary: true },
  { key: "originals", path: "/originals" },
  { key: "shop", path: "/shop", primary: true },
  {
    key: "play",
    path: "/play",
    children: [
      { key: "play_pick_em", path: "/play/pick-em" },
      { key: "play_fight_iq", path: "/play/fight-iq" },
      { key: "play_fan_club", path: "/play/fan-club" },
    ],
  },
  { key: "sponsors", path: "/sponsors" },
  {
    key: "about",
    path: "/about",
    children: [
      { key: "about_manifesto", path: "/about/manifesto" },
      { key: "about_founder", path: "/about/founder" },
      { key: "about_careers", path: "/about/careers" },
      { key: "about_franchise", path: "/about/franchise" },
    ],
  },
  { key: "contact", path: "/contact" },
  {
    key: "legal",
    path: "/legal",
    children: [
      { key: "legal_terms", path: "/legal/terms" },
      { key: "legal_privacy", path: "/legal/privacy" },
      { key: "legal_cookies", path: "/legal/cookies" },
    ],
  },
];

/** Sticky mobile bottom nav. The fifth slot is always the Menu button. */
export const bottomNavKeys = ["events", "watch", "fighters", "lions_den"] as const;

export type FlatNode = SiteNode & { trail: SiteNode[] };

export function flattenTree(nodes: SiteNode[] = siteTree, trail: SiteNode[] = []): FlatNode[] {
  return nodes.flatMap((node) => [
    { ...node, trail },
    ...flattenTree(node.children ?? [], [...trail, node]),
  ]);
}

export function findNodeByPath(path: string): FlatNode | undefined {
  return flattenTree().find((node) => node.path === path);
}

export function findNodeByKey(key: string): SiteNode | undefined {
  return flattenTree().find((node) => node.key === key);
}
