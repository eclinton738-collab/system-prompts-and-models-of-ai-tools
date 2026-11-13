import Link from "next/link";

/** Placeholder wordmark. Swap for the brand-bible logo when it lands. */
export function Logo({ shortName, name }: { shortName: string; name: string }) {
  return (
    <Link href="/" aria-label={`${shortName} ${name}`} className="flex items-center gap-2.5">
      <span className="display border-b-4 border-ember text-3xl leading-none text-bone">{shortName}</span>
      <span className="label hidden text-[0.625rem] leading-tight text-ash sm:block xl:max-w-none">{name}</span>
    </Link>
  );
}
