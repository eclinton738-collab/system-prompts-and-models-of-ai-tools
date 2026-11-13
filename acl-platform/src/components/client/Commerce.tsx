"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { money } from "@/lib/format";

export type CartLine = { productId: string; slug: string; name: string; priceMinor: number; currency: string; size: string | null; quantity: number };

const KEY = "acl_cart";
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;
function read(): CartLine[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    cache = [];
  }
  return cache!;
}
function write(lines: CartLine[]) {
  cache = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {}
  listeners.forEach((l) => l());
}
const EMPTY: CartLine[] = [];
function useCart() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );
}

export function CartLink() {
  const cart = useCart();
  const n = cart.reduce((s, l) => s + l.quantity, 0);
  return (
    <Link href="/cart" className="btn btn-ghost btn-sm">
      Cart{n > 0 && <span className="rounded-full bg-red px-1.5 text-xs text-white">{n}</span>}
    </Link>
  );
}

export function AddToCart({ product }: { product: { id: string; slug: string; name: string; priceMinor: number; currency: string; sizes: string[]; inventory: number } }) {
  const [size, setSize] = useState(product.sizes.length ? "" : null as string | null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (product.inventory === 0) return <p className="card px-4 py-3 text-sm font-semibold text-fog">Sold out. Follow ACL for restock alerts.</p>;
  return (
    <div className="space-y-4">
      {product.sizes.length > 0 && (
        <fieldset>
          <legend className="label">Size</legend>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button key={s} type="button" aria-pressed={size === s} onClick={() => { setSize(s); setError(null); }} className={`h-11 min-w-11 border px-3 text-sm font-semibold ${size === s ? "border-gold bg-gold text-black" : "border-line hover:border-fog"}`}>{s}</button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center border border-line">
          <button type="button" aria-label="Decrease quantity" className="h-11 w-11 text-xl" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <span aria-live="polite" className="w-8 text-center tabular-nums">{qty}</span>
          <button type="button" aria-label="Increase quantity" className="h-11 w-11 text-xl" onClick={() => setQty((q) => Math.min(product.inventory, 10, q + 1))}>+</button>
        </div>
        <button
          type="button"
          className="btn btn-red btn-lg flex-1 sm:flex-none"
          onClick={() => {
            if (product.sizes.length && !size) return setError("Choose a size first.");
            const lines = [...read()];
            const i = lines.findIndex((l) => l.productId === product.id && l.size === size);
            if (i >= 0) lines[i] = { ...lines[i], quantity: Math.min(10, lines[i].quantity + qty) };
            else lines.push({ productId: product.id, slug: product.slug, name: product.name, priceMinor: product.priceMinor, currency: product.currency, size, quantity: qty });
            write(lines);
            setAdded(true);
            setTimeout(() => setAdded(false), 2500);
          }}
        >
          {added ? "Added ✓" : "Add to cart"}
        </button>
        {added && <Link href="/cart" className="text-sm font-semibold text-gold underline">View cart</Link>}
      </div>
      {error && <p role="alert" className="text-sm text-red">{error}</p>}
      {product.inventory <= 40 && <p className="text-xs font-semibold uppercase tracking-widest text-gold">Only {product.inventory} left</p>}
    </div>
  );
}

const SHIP_FIELDS = [
  ["shippingName", "Full name", "name"],
  ["phone", "Phone number", "tel"],
  ["shippingAddress", "Delivery address", "street-address"],
  ["shippingCity", "City", "address-level2"],
  ["shippingCountry", "Country", "country-name"],
] as const;

export function CartView({ mockPayments, signedIn }: { mockPayments: boolean; signedIn: boolean }) {
  const router = useRouter();
  const cart = useCart();
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [promo, setPromo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  useEffect(() => setReady(true), []);

  if (!ready) return <div className="card h-48 animate-pulse" aria-busy="true" aria-label="Loading cart" />;
  if (!cart.length)
    return (
      <div className="card px-6 py-12 text-center">
        <p className="display text-3xl">Your cart is empty</p>
        <p className="mt-2 text-sm text-fog">Fighter tees, event merch and limited editions are waiting.</p>
        <Link href="/shop" className="btn btn-red mt-5">Shop ACL</Link>
      </div>
    );
  const currency = cart[0].currency;
  const subtotal = cart.reduce((n, l) => n + l.priceMinor * l.quantity, 0);
  const setQty = (i: number, q: number) => write(q <= 0 ? cart.filter((_, j) => j !== i) : cart.map((l, j) => (j === i ? { ...l, quantity: Math.min(10, q) } : l)));

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    const res = await api<{ id: string }>("/api/v1/orders/shop", { body: { items: cart.map((l) => ({ productId: l.productId, size: l.size, quantity: l.quantity })), promoCode: promo || null, ...form } });
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      setFields(res.error.fields ?? {});
      return;
    }
    write([]);
    router.push(`/account/orders/${res.data!.id}?placed=1`);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <ul className="divide-y divide-line border-y border-line">
        {cart.map((l, i) => (
          <li key={`${l.productId}-${l.size}`} className="flex items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <Link href={`/shop/${l.slug}`} className="font-semibold hover:text-gold">{l.name}</Link>
              <p className="text-sm text-fog">{l.size ? `Size ${l.size} · ` : ""}{money(l.priceMinor, l.currency)}</p>
            </div>
            <div className="flex items-center border border-line">
              <button type="button" aria-label={`Remove one ${l.name}`} className="h-10 w-10 text-lg" onClick={() => setQty(i, l.quantity - 1)}>−</button>
              <span className="w-7 text-center tabular-nums">{l.quantity}</span>
              <button type="button" aria-label={`Add one ${l.name}`} className="h-10 w-10 text-lg" onClick={() => setQty(i, l.quantity + 1)}>+</button>
            </div>
            <span className="w-20 text-right font-semibold tabular-nums">{money(l.priceMinor * l.quantity, l.currency)}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={checkout} className="card h-fit space-y-4 p-5">
        <h2 className="text-3xl">Checkout</h2>
        {SHIP_FIELDS.map(([name, label, ac]) => (
          <div key={name}>
            <label htmlFor={`c-${name}`} className="label">{label}</label>
            <input id={`c-${name}`} required autoComplete={ac} aria-invalid={fields[name] ? true : undefined} value={form[name] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))} className="field" />
            {fields[name] && <p className="mt-1 text-xs text-red">{fields[name]}</p>}
          </div>
        ))}
        <div>
          <label htmlFor="c-promo" className="label">Promo code</label>
          <input id="c-promo" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} aria-invalid={fields.promoCode ? true : undefined} className="field" placeholder="Optional" />
          {fields.promoCode && <p className="mt-1 text-xs text-red">{fields.promoCode}</p>}
        </div>
        <div className="flex items-center justify-between border-t border-line pt-4">
          <span className="text-sm uppercase tracking-widest text-fog">Subtotal</span>
          <span className="display text-3xl">{money(subtotal, currency)}</span>
        </div>
        <p className="text-xs text-fog">Discounts are applied when the order is placed.</p>
        {mockPayments && <p className="border border-gold/40 bg-gold/10 p-3 text-xs text-gold-soft">Demo checkout: the payment gateway is a mock service. No card is requested and no money is charged.</p>}
        <button type="submit" disabled={busy} className="btn btn-red btn-lg w-full">{busy ? "Placing order…" : signedIn ? "Place order" : "Sign in to order"}</button>
        {error && <p role="alert" className="text-sm text-red">{error}</p>}
      </form>
    </div>
  );
}

export function TicketPicker({
  eventId,
  types,
  mockPayments,
  signedIn,
  defaultName,
}: {
  eventId: string;
  types: { id: string; name: string; section: string; description: string | null; priceMinor: number; currency: string; remaining: number; salesOpen: boolean; display: string }[];
  mockPayments: boolean;
  signedIn: boolean;
  defaultName: string;
}) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [holder, setHolder] = useState(defaultName);
  const [promo, setPromo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = types.reduce((n, t) => n + (qty[t.id] ?? 0) * t.priceMinor, 0);
  const count = Object.values(qty).reduce((a, b) => a + b, 0);
  const currency = types[0]?.currency ?? "USD";

  async function buy() {
    setBusy(true);
    setError(null);
    const res = await api<{ id: string }>("/api/v1/orders/tickets", { body: { eventId, holderName: holder, promoCode: promo || null, items: Object.entries(qty).filter(([, q]) => q > 0).map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity })) } });
    setBusy(false);
    if (res.error) return setError(res.error.message);
    router.push(`/account/orders/${res.data!.id}?placed=1`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <ul className="space-y-3">
        {types.map((t) => {
          const q = qty[t.id] ?? 0;
          const soldOut = t.remaining <= 0;
          const available = t.salesOpen && !soldOut;
          return (
            <li key={t.id} className={`card flex flex-wrap items-center gap-4 p-4 ${q > 0 ? "border-gold" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="display text-2xl leading-none">{t.name}</p>
                <p className="mt-1 text-sm text-fog">{t.section}{t.description ? ` · ${t.description}` : ""}</p>
                {available && t.remaining <= 20 && <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gold">Only {t.remaining} left</p>}
              </div>
              <p className="text-right font-semibold">{t.display}</p>
              {available ? (
                <div className="flex items-center border border-line">
                  <button type="button" aria-label={`Fewer ${t.name} tickets`} disabled={q === 0} className="h-11 w-11 text-xl disabled:opacity-30" onClick={() => setQty((s) => ({ ...s, [t.id]: Math.max(0, q - 1) }))}>−</button>
                  <span aria-live="polite" className="w-8 text-center tabular-nums">{q}</span>
                  <button type="button" aria-label={`More ${t.name} tickets`} disabled={q >= Math.min(8, t.remaining)} className="h-11 w-11 text-xl disabled:opacity-30" onClick={() => setQty((s) => ({ ...s, [t.id]: q + 1 }))}>+</button>
                </div>
              ) : (
                <span className="chip chip-outline">{soldOut ? "Sold out" : "Not on sale"}</span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="card h-fit space-y-4 p-5">
        <h2 className="text-3xl">Your order</h2>
        <div>
          <label htmlFor="t-holder" className="label">Ticket holder name</label>
          <input id="t-holder" value={holder} onChange={(e) => setHolder(e.target.value)} autoComplete="name" className="field" />
        </div>
        <div>
          <label htmlFor="t-promo" className="label">Promo code</label>
          <input id="t-promo" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} className="field" placeholder="Optional" />
        </div>
        <div className="flex items-center justify-between border-t border-line pt-4">
          <span className="text-sm uppercase tracking-widest text-fog">{count} {count === 1 ? "ticket" : "tickets"}</span>
          <span className="display text-3xl">{money(total, currency)}</span>
        </div>
        {mockPayments && <p className="border border-gold/40 bg-gold/10 p-3 text-xs text-gold-soft">Demo checkout: the payment gateway is a mock service. No money is charged; tickets issued here are for demonstration.</p>}
        <button type="button" disabled={busy || count === 0} onClick={buy} className="btn btn-red btn-lg w-full">{busy ? "Processing…" : signedIn ? "Buy tickets" : "Sign in to buy"}</button>
        {error && <p role="alert" className="text-sm text-red">{error}</p>}
        <p className="text-xs text-fog">Digital tickets with QR codes are delivered to your ACL account instantly.</p>
      </div>
    </div>
  );
}
