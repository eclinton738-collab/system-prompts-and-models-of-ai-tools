import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getMoney } from "@/server/services/money";
import { Artwork } from "@/components/media";
import { ProductCard } from "@/components/cards";
import { AddToCart, CartLink } from "@/components/client/Commerce";
import { ShareButtons } from "@/components/client/ShareButtons";
import { Breadcrumbs, JsonLd } from "@/components/ui";
import { label } from "@/lib/format";
import { abs } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };
const load = (slug: string) => db.product.findFirst({ where: { slug, active: true }, include: { fighter: { select: { slug: true, firstName: true, lastName: true } }, event: { select: { slug: true, name: true } } } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: `${p.name} — ACL Shop`, description: p.description, alternates: { canonical: `/shop/${p.slug}` } } : { title: "Product" };
}

export default async function ProductPage({ params }: Props) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const [m, more] = await Promise.all([getMoney(), db.product.findMany({ where: { active: true, id: { not: p.id }, category: p.category }, take: 4 })]);
  return (
    <article className="container-acl py-6 sm:py-10" data-entity-type="product" data-entity-id={p.id}>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description, brand: { "@type": "Brand", name: "Africa Combat League" }, offers: { "@type": "Offer", url: abs(`/shop/${p.slug}`), price: p.priceMinor / 100, priceCurrency: p.currency, availability: p.inventory > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } }} />
      <div className="flex items-start justify-between gap-3">
        <Breadcrumbs items={[{ href: "/shop", label: "Shop" }, { href: `/shop?category=${p.category.toLowerCase()}`, label: label(p.category) }, { label: p.name }]} />
        <CartLink />
      </div>
      <div className="mt-2 grid gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden border border-line"><Artwork src={p.imageUrl} alt={p.name} seed={p.slug} tone={p.limited ? "gold" : "steel"} kicker={label(p.category)} label={p.name} /></div>
        <div>
          {p.limited && <span className="chip chip-gold mb-3">Limited edition</span>}
          <h1 className="text-4xl sm:text-6xl">{p.name}</h1>
          <p className="display mt-3 text-4xl text-gold">{m.fmt(p.priceMinor, p.currency)}</p>
          <p className="mt-4 max-w-xl text-bone/85">{p.description}</p>
          <div className="mt-6"><AddToCart product={{ id: p.id, slug: p.slug, name: p.name, priceMinor: p.priceMinor, currency: p.currency, sizes: p.sizes, inventory: p.inventory }} /></div>
          <div className="mt-6 flex flex-wrap gap-2">
            {p.fighter && <Link href={`/fighters/${p.fighter.slug}`} className="btn btn-ghost btn-sm">Follow {p.fighter.firstName} {p.fighter.lastName}</Link>}
            {p.event && <Link href={`/events/${p.event.slug}`} className="btn btn-ghost btn-sm">{p.event.name}</Link>}
          </div>
          <div className="mt-6"><ShareButtons path={`/shop/${p.slug}`} title={`${p.name} — ACL Shop`} /></div>
        </div>
      </div>
      {more.length > 0 && (
        <section aria-labelledby="more" className="mt-14">
          <h2 id="more" className="mb-5 text-3xl">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{more.map((x) => <ProductCard key={x.id} product={x} price={m.fmt(x.priceMinor, x.currency)} />)}</div>
        </section>
      )}
    </article>
  );
}
