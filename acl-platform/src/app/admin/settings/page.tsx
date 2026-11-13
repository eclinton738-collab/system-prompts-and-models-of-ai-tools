import Link from "next/link";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { getPaymentProvider } from "@/server/integrations/payments";
import { getAiProvider } from "@/server/integrations/ai";
import { ApiForm } from "@/components/client/ApiForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePermission("settings.manage");
  const s = Object.fromEntries((await db.siteSetting.findMany()).map((x) => [x.key, x.value]));
  const pay = getPaymentProvider();
  const ai = getAiProvider();
  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-4xl sm:text-5xl">Settings</h1>
      <div className="card p-5 sm:p-6">
        <ApiForm endpoint="/api/v1/admin/settings" method="PUT" refresh submitLabel="Save settings" successMessage="Settings saved." initial={{ ...s, demoMode: s.demoMode === "true" }}
          fields={[
            { name: "demoMode", label: "Demo mode — show the “demo data” notice in the footer and demo accounts on the sign-in page", type: "checkbox" },
            { name: "contactEmail", label: "Contact email", type: "email", half: true }, { name: "pressEmail", label: "Press email", type: "email", half: true }, { name: "partnershipsEmail", label: "Partnerships email", type: "email", half: true },
            { name: "instagramUrl", label: "Instagram URL", type: "url", half: true }, { name: "tiktokUrl", label: "TikTok URL", type: "url", half: true }, { name: "youtubeUrl", label: "YouTube URL", type: "url", half: true }, { name: "xUrl", label: "X URL", type: "url", half: true }, { name: "facebookUrl", label: "Facebook URL", type: "url", half: true },
          ]} />
      </div>
      <h2 className="mb-3 mt-8 text-2xl">Integrations</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li className="card p-4"><p className="label">Payments</p><p className="font-semibold">{pay.name}</p><p className="text-sm text-fog">{pay.isMock ? "Mock provider: checkout approves instantly and moves no money. Set PAYMENT_PROVIDER after adding a gateway adapter." : "Live gateway."}</p></li>
        <li className="card p-4"><p className="label">AI / recommendations</p><p className="font-semibold">{ai.name}</p><p className="text-sm text-fog">{ai.isHeuristic ? "Rules engine over league data. Swap in an LLM provider for natural-language features." : "Model-backed provider."}</p></li>
        <li className="card p-4"><p className="label">Media storage & video</p><p className="text-sm text-fog">Assets are referenced by URL. Upload to your object storage / video CDN and paste the https URL into the photo or video record.</p></li>
        <li className="card p-4"><p className="label">More settings</p><ul className="space-y-1 text-sm"><li><Link href="/admin/divisions" className="text-gold underline">Weight divisions</Link></li><li><Link href="/admin/currencies" className="text-gold underline">Currencies & display rates</Link></li><li><Link href="/admin/countries" className="text-gold underline">Priority markets</Link></li><li><Link href="/admin/audit" className="text-gold underline">Audit log</Link></li></ul></li>
      </ul>
    </div>
  );
}
