import { cx } from "./ui";

/**
 * Artwork components. Each renders the uploaded asset when a URL exists and a
 * branded, generated treatment when it does not, so pages never show broken images.
 */

function hue(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function FighterPortrait({
  fighter,
  champion,
  className,
  flip,
  priority,
}: {
  fighter: { firstName: string; lastName: string; photoUrl?: string | null; slug?: string };
  champion?: boolean;
  className?: string;
  flip?: boolean;
  priority?: boolean;
}) {
  const name = `${fighter.firstName} ${fighter.lastName}`;
  if (fighter.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fighter.photoUrl} alt={name} loading={priority ? "eager" : "lazy"} decoding="async" className={cx("h-full w-full object-cover object-top", className)} />;
  }
  const id = `p-${fighter.slug ?? fighter.lastName}`.replace(/[^a-zA-Z0-9-]/g, "");
  const accent = champion ? "#d6ab3b" : "#e3182d";
  const tilt = (hue(name) % 9) - 4;
  return (
    <svg viewBox="0 0 400 500" role="img" aria-label={`${name} — portrait artwork`} preserveAspectRatio="xMidYMax slice" className={cx("h-full w-full", className)}>
      <defs>
        <radialGradient id={`${id}-g`} cx="50%" cy="28%" r="75%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.5" />
          <stop offset="55%" stopColor="#1a1a1f" stopOpacity="1" />
          <stop offset="100%" stopColor="#08080a" />
        </radialGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a3a44" />
          <stop offset="60%" stopColor="#15151a" />
          <stop offset="100%" stopColor="#060607" />
        </linearGradient>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="70%" stopColor="#08080a" stopOpacity="0" />
          <stop offset="100%" stopColor="#08080a" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill={`url(#${id}-g)`} />
      <text x="200" y="250" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="250" fill="#fff" opacity="0.05" transform={`rotate(${tilt} 200 250)`}>
        {fighter.lastName.slice(0, 3).toUpperCase()}
      </text>
      <g transform={flip ? "translate(400 0) scale(-1 1)" : undefined}>
        {/* Stylised boxer in guard */}
        <path d="M60 500 C62 400 104 348 168 336 L176 300 L226 300 L234 336 C298 348 340 400 342 500 Z" fill={`url(#${id}-b)`} />
        <ellipse cx="201" cy="232" rx="56" ry="70" fill={`url(#${id}-b)`} />
        <path d="M150 214 C156 160 246 160 252 214 C232 196 170 196 150 214 Z" fill="#0b0b0d" />
        <g>
          <rect x="94" y="268" width="92" height="104" rx="40" fill={accent} transform="rotate(-10 140 320)" />
          <rect x="100" y="352" width="70" height="26" rx="6" fill="#f6f4ef" opacity="0.9" transform="rotate(-10 135 365)" />
          <rect x="226" y="246" width="88" height="100" rx="40" fill={accent} opacity="0.92" transform="rotate(8 270 296)" />
          <rect x="238" y="328" width="68" height="24" rx="6" fill="#f6f4ef" opacity="0.85" transform="rotate(8 272 340)" />
        </g>
        <path d="M252 214 C262 250 258 280 240 296" stroke={accent} strokeWidth="3" fill="none" opacity="0.7" />
      </g>
      <rect width="400" height="500" fill={`url(#${id}-f)`} />
    </svg>
  );
}

const TONES = {
  red: ["#e3182d", "#3b0a10"],
  gold: ["#d6ab3b", "#3a2c08"],
  steel: ["#4b4b57", "#121216"],
} as const;

/** Generated poster/thumbnail: used for events, videos, articles and products without uploaded art. */
export function Artwork({
  src,
  alt,
  label,
  kicker,
  tone = "red",
  seed = "",
  className,
  children,
}: {
  src?: string | null;
  alt: string;
  label?: string;
  kicker?: string;
  tone?: keyof typeof TONES;
  seed?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" decoding="async" className={cx("h-full w-full object-cover", className)} />;
  }
  const [a, b] = TONES[tone];
  const angle = 100 + (hue(seed || alt) % 50);
  return (
    <div
      role="img"
      aria-label={alt}
      className={cx("relative flex h-full w-full flex-col justify-end overflow-hidden p-3", className)}
      style={{ background: `linear-gradient(${angle}deg, ${b} 0%, #0b0b0d 55%), radial-gradient(circle at 80% 10%, ${a}, transparent 60%)`, backgroundBlendMode: "screen" }}
    >
      <div aria-hidden className="absolute -right-6 -top-10 h-40 w-40 rotate-12 opacity-30" style={{ background: `linear-gradient(135deg, ${a}, transparent 70%)` }} />
      <div aria-hidden className="slash-bg absolute inset-0" />
      <span aria-hidden className="display absolute right-3 top-2 text-lg tracking-widest text-white/25">ACL</span>
      {children}
      {kicker && <span className="relative text-[0.62rem] font-bold uppercase tracking-[0.16em] text-gold">{kicker}</span>}
      {label && <span className="display relative line-clamp-2 text-xl leading-none text-white/90">{label}</span>}
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 132 40" className={className} role="img" aria-label="Africa Combat League">
      <path d="M2 2 H38 L44 8 V30 L22 38 L2 30 Z" fill="#e3182d" />
      <path d="M8 8 H36 V26 L22 31.5 L8 26 Z" fill="#08080a" />
      <path d="M22 11 L30 26 H26.2 L24.8 23 H19.2 L17.8 26 H14 Z M20.5 20 H23.5 L22 16.6 Z" fill="#d6ab3b" />
      <text x="52" y="30" fontFamily="var(--font-display)" fontWeight="900" fontSize="32" letterSpacing="1" fill="#f6f4ef">ACL</text>
    </svg>
  );
}

export function BeltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden>
      <rect x="0" y="10" width="64" height="12" rx="2" fill="#7a1420" />
      <rect x="6" y="8" width="10" height="16" rx="2" fill="#d6ab3b" />
      <rect x="48" y="8" width="10" height="16" rx="2" fill="#d6ab3b" />
      <ellipse cx="32" cy="16" rx="13" ry="15" fill="#d6ab3b" />
      <ellipse cx="32" cy="16" rx="9" ry="11" fill="#f1d684" />
      <path d="M32 8 L36.5 22 H27.5 Z" fill="#7a1420" />
    </svg>
  );
}
