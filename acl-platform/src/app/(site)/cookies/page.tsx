import { LegalPage } from "@/components/Legal";
export const metadata = { title: "Cookie Policy", alternates: { canonical: "/cookies" } };
export default function Page() {
  return <LegalPage title="Cookie policy" sections={[
    ["Essential cookies", "acl_session keeps you signed in (HTTP-only, same-site). acl_currency remembers your display currency."],
    ["Local storage", "Your shopping cart and a random analytics identifier are stored in your browser’s local storage, not in cookies."],
    ["No advertising cookies", "The platform does not set third-party advertising or cross-site tracking cookies."],
  ]} />;
}
