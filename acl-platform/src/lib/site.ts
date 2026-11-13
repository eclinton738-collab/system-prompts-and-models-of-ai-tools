export const SITE = {
  name: "Africa Combat League",
  short: "ACL",
  tagline: "Africa's premier combat sports league",
  description:
    "The digital home of African combat sports. Fighters, fight cards, rankings, champions, live results, tickets and ACL Originals.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
};

export const abs = (path: string) => `${SITE.url}${path}`;

export const MAIN_NAV = [
  { href: "/", label: "Home" },
  { href: "/fights", label: "Fights" },
  { href: "/fighters", label: "Fighters" },
  { href: "/rankings", label: "Rankings" },
  { href: "/champions", label: "Champions" },
  { href: "/events", label: "Events" },
  { href: "/news", label: "News" },
  { href: "/watch", label: "Watch" },
  { href: "/media", label: "Media" },
  { href: "/shop", label: "Shop" },
  { href: "/community", label: "Community" },
  { href: "/about", label: "About ACL" },
] as const;

export const MORE_NAV = [
  { href: "/rivalries", label: "Rivalries" },
  { href: "/state-wars", label: "State Wars" },
  { href: "/originals", label: "ACL Originals" },
  { href: "/map", label: "Africa Combat Map" },
  { href: "/rankings/countries", label: "Country Rankings" },
  { href: "/gyms", label: "Gym Directory" },
  { href: "/predictions", label: "Fan Predictions" },
  { href: "/leaderboard", label: "Fan Leaderboard" },
  { href: "/apply", label: "Become an ACL Fighter" },
  { href: "/partners", label: "Partner with ACL" },
] as const;

export const FOOTER_NAV = [
  {
    title: "ACL",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/careers", label: "Careers" },
      { href: "/media", label: "Media" },
      { href: "/partners", label: "Partners" },
    ],
  },
  {
    title: "Compete",
    links: [
      { href: "/fighters", label: "Fighters" },
      { href: "/events", label: "Events" },
      { href: "/rankings", label: "Rankings" },
      { href: "/champions", label: "Champions" },
      { href: "/apply", label: "Become a fighter" },
      { href: "/gyms", label: "Gyms" },
    ],
  },
  {
    title: "Follow",
    links: [
      { href: "/news", label: "News" },
      { href: "/watch", label: "Watch" },
      { href: "/originals", label: "Originals" },
      { href: "/rivalries", label: "Rivalries" },
      { href: "/map", label: "Combat Map" },
      { href: "/community", label: "Community" },
    ],
  },
  {
    title: "Get involved",
    links: [
      { href: "/shop", label: "Shop" },
      { href: "/tickets", label: "Tickets" },
      { href: "/join", label: "Join ACL" },
      { href: "/account", label: "ACL Passport" },
    ],
  },
] as const;

export const LEGAL_NAV = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookie Policy" },
] as const;

// Official channels are configured in admin settings once the accounts exist.
export const SOCIALS = ["Instagram", "TikTok", "YouTube", "X", "Facebook"] as const;

export const FIGHT_STYLES = ["Pressure fighter", "Boxer-puncher", "Out-boxer", "Counter-puncher", "Swarmer", "Slugger"] as const;
export const GYM_DISCIPLINES = ["Boxing", "MMA", "Wrestling", "Kickboxing", "Fitness"] as const;
