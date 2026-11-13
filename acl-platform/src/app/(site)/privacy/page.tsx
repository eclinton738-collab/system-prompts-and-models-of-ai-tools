import { LegalPage } from "@/components/Legal";
export const metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };
export default function Page() {
  return <LegalPage title="Privacy policy" sections={[
    ["What we collect", "Account details you give us (name, email, country, city), the fighters and events you follow, predictions, orders and tickets, and applications you submit. Passwords are stored only as salted scrypt hashes."],
    ["Analytics", "The site records first-party page views with a random browser identifier, approximate country and referring site. No third-party advertising trackers are loaded."],
    ["How we use it", "To run your account, deliver tickets and orders, personalise your feed, send the alerts you opt into, and understand how the platform is used."],
    ["Sharing", "Payment processing is handled by a payment provider; ACL does not store card details. We do not sell personal data."],
    ["Your choices", "You control alert preferences in your account. Contact us to access, correct or delete your data."],
  ]} />;
}
