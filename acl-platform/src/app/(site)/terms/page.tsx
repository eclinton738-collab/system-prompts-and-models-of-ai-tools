import { LegalPage } from "@/components/Legal";
export const metadata = { title: "Terms of Use", alternates: { canonical: "/terms" } };
export default function Page() {
  return <LegalPage title="Terms of use" sections={[
    ["Accounts", "You are responsible for activity on your account and for keeping your password secret. One account per person."],
    ["Fan predictions and points", "Predictions, fan points, ranks and badges are free engagement features. They have no cash value, cannot be exchanged or transferred, and are not gambling."],
    ["Tickets", "Tickets are issued digitally to the purchasing account. Each QR code admits one person once. Event details may change; cancellation and refund terms are published per event."],
    ["Shop", "Prices are charged in the listed currency. Display-currency conversions are estimates."],
    ["Community", "Be respectful. Abuse, hate speech, harassment and betting promotion are removed and may lead to suspension."],
    ["Content", "ACL video, photography, marks and data are owned by Africa Combat League and may not be reused without permission. Media use is covered by the Media Center terms."],
  ]} />;
}
