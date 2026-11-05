import { Link } from "react-router";
import { SearchX, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { usePrefs } from "@/context/PrefsContext";

export function NotFound() {
  const { t } = usePrefs();
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <EmptyState icon={SearchX} title={t("not_found_title")} body={t("not_found_body")}>
        <Link to="/" className="btn-primary">{t("go_home")}</Link>
      </EmptyState>
    </div>
  );
}

/** Also catches failed lazy chunks, which is what users hit just after a new deploy. */
export function RouteError() {
  const { t } = usePrefs();
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <EmptyState icon={TriangleAlert} title={t("error_boundary_title")}>
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>{t("reload")}</button>
      </EmptyState>
    </div>
  );
}
