import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import world from "world-atlas/countries-110m.json";

type CountryDatum = { code: string; name: string; fighters: number; gyms: number };

const W = 600;
const H = 640;

// Geometry is projected once at module load and reused for every request.
const africa = (() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = feature(world as any, (world as any).objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
  return all.features;
})();

/**
 * Server-rendered SVG map of Africa: no client JavaScript, no map tiles, a few KB of markup.
 * Countries with ACL fighters or gyms are highlighted and link to their country page.
 */
export function AfricaMap({ data, active, className }: { data: Record<string, CountryDatum>; active?: string; className?: string }) {
  const features = africa.filter((f) => data[String(f.id)] || f.properties.name === "W. Sahara" || f.properties.name === "Somaliland");
  const projection = geoMercator().fitSize([W, H], { type: "FeatureCollection", features });
  const path = geoPath(projection);
  const max = Math.max(1, ...Object.values(data).map((d) => d.fighters));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="group" aria-label="Map of Africa showing ACL fighters and gyms by country">
      {features.map((f, i) => {
        const d = data[String(f.id)];
        const dPath = path(f) ?? "";
        const has = d && (d.fighters > 0 || d.gyms > 0);
        if (!d || !has) return <path key={i} d={dPath} fill="#17171c" stroke="#2a2a31" strokeWidth={0.8} />;
        const intensity = 0.35 + 0.65 * (d.fighters / max);
        const isActive = active === d.code;
        const [cx, cy] = path.centroid(f);
        return (
          <Link key={i} href={`/map/${d.code.toLowerCase()}`} aria-label={`${d.name}: ${d.fighters} fighters, ${d.gyms} gyms`}>
            <path d={dPath} fill={isActive ? "#d6ab3b" : "#e3182d"} fillOpacity={isActive ? 1 : intensity} stroke={isActive ? "#f1d684" : "#08080a"} strokeWidth={isActive ? 2 : 0.8} className="transition-[fill-opacity] hover:fill-opacity-100">
              <title>{`${d.name} — ${d.fighters} fighters · ${d.gyms} gyms`}</title>
            </path>
            {d.fighters > 0 && (
              <g pointerEvents="none">
                <circle cx={cx} cy={cy} r={11} fill="#08080a" stroke={isActive ? "#08080a" : "#d6ab3b"} strokeWidth={1.5} />
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#f6f4ef">{d.fighters}</text>
              </g>
            )}
          </Link>
        );
      })}
    </svg>
  );
}
