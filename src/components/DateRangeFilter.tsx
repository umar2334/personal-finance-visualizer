import { usePrefs } from "@/context/PrefsContext";
import type { TranslationKey } from "@/i18n/translations";
import type { RangePreset } from "@/lib/dates";

const PRESETS: RangePreset[] = ["this_month", "last_month", "last_3_months", "this_year", "all", "custom"];

interface Props {
  preset: RangePreset;
  from: string;
  to: string;
  onPreset: (preset: RangePreset) => void;
  onCustom: (from: string, to: string) => void;
}

export function DateRangeFilter({ preset, from, to, onPreset, onCustom }: Props) {
  const { t } = usePrefs();
  return (
    <div className="flex flex-1 flex-wrap items-end gap-2 sm:flex-none">
      <label className="min-w-36 flex-1 sm:w-40 sm:flex-none">
        <span className="sr-only">{t("period")}</span>
        <select className="field" value={preset} onChange={(e) => onPreset(e.target.value as RangePreset)}>
          {PRESETS.map((p) => <option key={p} value={p}>{t(`range_${p}` as TranslationKey)}</option>)}
        </select>
      </label>
      {preset === "custom" && (
        <>
          <label className="flex-1 sm:flex-none">
            <span className="sr-only">{t("from")}</span>
            <input type="date" aria-label={t("from")} className="field" value={from} max={to || undefined} onChange={(e) => onCustom(e.target.value, to)} />
          </label>
          <label className="flex-1 sm:flex-none">
            <span className="sr-only">{t("to")}</span>
            <input type="date" aria-label={t("to")} className="field" value={to} min={from || undefined} onChange={(e) => onCustom(from, e.target.value)} />
          </label>
        </>
      )}
    </div>
  );
}
