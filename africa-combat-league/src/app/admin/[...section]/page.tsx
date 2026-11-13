import { notFound } from "next/navigation";
import { findAdminItem } from "@/config/admin-nav";
import { getTranslator } from "@/i18n";
import { requireAdmin } from "@/lib/auth/session";
import { ComingSoon } from "@/components/ui/coming-soon";

type Props = { params: Promise<{ section: string[] }> };

// Admin sections that are not built yet. Access is still checked per department.
export default async function AdminComingSoon({ params }: Props) {
  const { section } = await params;
  const path = `/admin/${section.join("/")}`;
  const match = findAdminItem(path);
  if (!match) notFound();
  await requireAdmin(match.section.roles, path);
  const t = await getTranslator();

  return (
    <div className="-mx-4">
      <ComingSoon
        title={t(`admin.items.${match.item.key}`)}
        badge={t("common.coming_soon")}
        body={t("common.coming_soon_body")}
        back={{ label: t("admin.dashboard"), path: "/admin" }}
      />
    </div>
  );
}
