import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { getMoney } from "@/server/services/money";
import { ProductCard } from "@/components/cards";
import { CartLink } from "@/components/client/Commerce";
import { EmptyState, PageHeader } from "@/components/ui";
import { label } from "@/lib/format";

export const metadata: Metadata = { title: "Shop", description: "Official Africa Combat League merchandise: shirts, hoodies, caps, fighter and event merch, championship and limited editions.", alternates: { canonical: "/shop" } };
const CATS = ["SHIRTS", "HOODIES", "CAPS", "FIGHTER", "EVENT", "CHAMPIONSHIP", "GYM", "LIMITED"] as const;

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const sp = await searchParams;
  const cat = CATS.find((c) => c.toLowerCase() === sp.category);
  const [products, m] = await Promise.all([db.product.findMany({ where: { active: true, ...(cat && { category: cat }) }, orderBy: [{ limited: "desc" }, { name: "asc" }] }), getMoney()]);
  return (
    <>
      <PageHeader eyebrow="Official merchandise" title="ACL Shop" intro="Wear the league. A share of every fighter item goes to the athlete.">
        <div className="mt-4"><CartLink /></div>
      </PageHeader>
      <div className="container-acl py-6 sm:py-10">
        <nav aria-label="Product categories" className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
          <ul className="flex min-w-max gap-2">
            <li><Link href="/shop" aria-current={!cat ? "page" : undefined} className={`chip min-h-9 px-3 ${!cat ? "chip-red" : "chip-outline"}`}>All</Link></li>
            {CATS.map((c) => <li key={c}><Link href={`/shop?category=${c.toLowerCase()}`} aria-current={cat === c ? "page" : undefined} className={`chip min-h-9 px-3 ${cat === c ? "chip-red" : "chip-outline hover:text-bone"}`}>{c === "FIGHTER" ? "Fighter merch" : c === "LIMITED" ? "Limited editions" : label(c)}</Link></li>)}
          </ul>
        </nav>
        {products.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} price={m.fmt(p.priceMinor, p.currency)} />)}</div> : <EmptyState title="Nothing in this category yet" action={{ href: "/shop", label: "All products" }} />}
        <p className="mt-8 text-sm text-fog">Promo codes are applied at checkout. Prices are charged in the listed currency; choose a display currency in the footer to see an estimate in yours.</p>
      </div>
    </>
  );
}
