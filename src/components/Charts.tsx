import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePrefs } from "@/context/PrefsContext";
import type { CategorySpend, MonthPoint } from "@/lib/calculations";
import { formatMonth } from "@/lib/dates";
import { CategoryDot, Money } from "./ui";

const axis = { fontSize: 12, fill: "var(--muted)" };
const tooltipStyle = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 },
  itemStyle: { color: "var(--text)" },
  labelStyle: { color: "var(--muted)" },
  cursor: { fill: "var(--surface-2)" },
};

/** Charts stay left-to-right in Urdu: time still runs left to right on an axis. */
export function IncomeExpenseChart({ data }: { data: MonthPoint[] }) {
  const { t, lang, money } = usePrefs();
  const rows = data.map((d) => ({ ...d, label: formatMonth(d.month, lang, true) }));
  return (
    <div dir="ltr" className="h-64" role="img" aria-label={t("chart_income_vs_expense")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} width={76} tickFormatter={(v: number) => money(v, true)} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => money(v)} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar isAnimationActive={false} dataKey="income" name={t("income")} fill="var(--chart-income)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar isAnimationActive={false} dataKey="expense" name={t("expense")} fill="var(--chart-expense)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({ data }: { data: MonthPoint[] }) {
  const { t, lang, money } = usePrefs();
  const rows = data.map((d) => ({ ...d, label: formatMonth(d.month, lang, true) }));
  return (
    <div dir="ltr" className="h-64" role="img" aria-label={t("chart_trend")}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} width={76} tickFormatter={(v: number) => money(v, true)} />
          <ReferenceLine y={0} stroke="var(--muted)" />
          <Tooltip {...tooltipStyle} cursor={{ stroke: "var(--border)" }} formatter={(v: number) => money(v)} />
          <Area isAnimationActive={false} type="monotone" dataKey="net" name={t("net")} stroke="var(--chart-net)" strokeWidth={2} fill="var(--chart-net)" fillOpacity={0.12} dot={{ r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryChart({ rows, total }: { rows: CategorySpend[]; total: number }) {
  const { t, money, categoryLabel } = usePrefs();
  return (
    <div className="grid items-center gap-4 sm:grid-cols-2">
      <div dir="ltr" className="relative h-52" role="img" aria-label={t("chart_by_category")}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie isAnimationActive={false} data={rows.map((r) => ({ name: categoryLabel(r.category), value: r.amount, color: r.category.color }))} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
              {rows.map((r) => <Cell key={r.category.id} fill={r.category.color} />)}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v: number) => money(v)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted">{t("total")}</span>
          <span className="text-sm font-semibold tabular-nums">{money(total, true)}</span>
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.category.id} className="flex items-center gap-2">
            <CategoryDot color={r.category.color} />
            <span className="min-w-0 flex-1 truncate">{categoryLabel(r.category)}</span>
            <span className="text-xs text-muted tabular-nums">{r.percentage < 1 ? "<1" : r.percentage}%</span>
            <Money value={r.amount} className="font-medium" />
          </li>
        ))}
      </ul>
    </div>
  );
}
