import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth";
import { getPaymentProvider } from "@/server/integrations/payments";
import { CartView } from "@/components/client/Commerce";
import { Breadcrumbs } from "@/components/ui";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default async function CartPage() {
  const user = await getCurrentUser();
  return (
    <div className="container-acl py-6 sm:py-10">
      <Breadcrumbs items={[{ href: "/shop", label: "Shop" }, { label: "Cart" }]} />
      <h1 className="mb-8 text-4xl sm:text-6xl">Your cart</h1>
      <CartView mockPayments={getPaymentProvider().isMock} signedIn={!!user} />
    </div>
  );
}
