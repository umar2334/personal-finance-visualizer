import { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Plus, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useTransactions } from "../context/TransactionContext";
import { useAuth } from "../context/AuthContext";
import { getCategoryBreakdown, getMonthlyChartData, CATEGORY_COLORS } from "../data/mockData";
import { useNavigate } from "react-router";

function KpiCard({ title, value, sub, icon: Icon, color, trend }: {
  title: string; value: string; sub: string;
  icon: React.ElementType; color: string; trend?: "up" | "down";  
}) {
  return (
    <div className="bg-[#0d1426] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend && (
          <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
            trend === "up" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}>
            <ArrowUpRight size={11} style={{ transform: trend === "down" ? "rotate(90deg)" : "" }} />
            {trend === "up" ? "Income" : "Expense"}
          </div>
        )}
      </div>
      <div className="text-white mb-1" style={{ fontSize: "1.4rem", fontWeight: 700 }}>{value}</div>
      <div className="text-sm text-slate-400">{title}</div>
      <div className="text-xs text-slate-600 mt-0.5">{sub}</div>
    </div>
  );
}

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a2540] border border-white/10 rounded-xl p-3 text-sm shadow-xl">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map((e: any) => (
        <div key={e.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
          <span className="text-slate-300 text-xs">{e.name}:</span>
          <span className="text-white text-xs" style={{ fontWeight: 600 }}>
            Rs. {Number(e.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

export function Dashboard() {
  const { transactions } = useTransactions();
  const { user } = useAuth();
  const navigate = useNavigate();

  const now = new Date();
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalIncome  = useMemo(() => transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0), [transactions]);
  const netSavings   = totalIncome - totalExpense;

  const monthIncome  = thisMonth.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const monthExpense = thisMonth.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const categoryData  = useMemo(() => getCategoryBreakdown(transactions).slice(0, 6), [transactions]);
  const monthlyData   = useMemo(() => getMonthlyChartData(transactions), [transactions]);

  const recentTx = [...transactions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 7);

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <p className="text-slate-400 text-sm">{greeting()},</p>
          <h2 className="text-white" style={{ fontSize: "1.3rem", fontWeight: 700 }}>{user?.name} 👋</h2>
        </div>
        <button
          onClick={() => navigate("/transactions?new=1")}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl px-4 py-2.5 text-sm transition-all shadow-lg shadow-blue-500/20"
          style={{ fontWeight: 600 }}
        >
          <Plus size={15} />
          New Entry
        </button>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Month Income",   value: `Rs. ${monthIncome.toLocaleString()}`,              sub: "This month's earnings",  icon: TrendingUp,   color: "#22c55e", trend: "up"   as const },
          { title: "Month Expense",  value: `Rs. ${monthExpense.toLocaleString()}`,             sub: "This month's spending",  icon: TrendingDown, color: "#ef4444", trend: "down" as const },
          { title: "Total Savings",  value: `Rs. ${netSavings.toLocaleString()}`,               sub: "All time net",           icon: Wallet,       color: "#3b82f6"                         },
          { title: "Current Balance",value: `Rs. ${(monthIncome - monthExpense).toLocaleString()}`, sub: "Net this month",    icon: PiggyBank,    color: "#a855f7"                         },
        ].map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <KpiCard {...c} />
          </motion.div>
        ))} 
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="lg:col-span-2 bg-[#0d1426] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Monthly Income vs Expenses</h3>
              <p className="text-xs text-slate-500 mt-0.5">Last 3 months</p>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /><span className="text-slate-400">Income</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-500" /><span className="text-slate-400">Expense</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="income" name="Income" stroke="#22c55e" strokeWidth={2} fill="url(#gIncome)" />
              <Area type="monotone" dataKey="expenses" name="Expense" stroke="#ef4444" strokeWidth={2} fill="url(#gExpense)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-[#0d1426] border border-white/5 rounded-2xl p-5">
          <h3 className="text-white text-sm mb-1" style={{ fontWeight: 600 }}>Spending by Category</h3>
          <p className="text-xs text-slate-500 mb-3">Category breakdown</p>
          <ResponsiveContainer width="100%" height={155}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="amount">
                {categoryData.map((entry) => (
                  <Cell key={`cell-${entry.category}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, ""]}
                contentStyle={{ background: "#1a2540", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {categoryData.slice(0, 5).map((c) => (
              <div key={c.category} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                <span className="text-xs text-slate-400 flex-1 truncate">{c.category}</span>
                <span className="text-xs text-slate-300">{c.percentage}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent transactions */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-[#0d1426] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Recent Transactions</h3>
          <button onClick={() => navigate("/transactions")} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            View All →
          </button>
        </div>
        <div className="space-y-1">
          {recentTx.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No transactions yet. Add your first entry!</p>
          ) : (
            recentTx.map((t) => {
              const color = CATEGORY_COLORS[t.category] || "#64748b";
              return (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/3 transition-all">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
                    {t.amount > 0 ? "💰" : categoryEmoji(t.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{t.description}</p>
                    <p className="text-xs text-slate-500">
                      {t.category} · {new Date(t.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span className="text-sm flex-shrink-0" style={{ fontWeight: 700, color: t.amount > 0 ? "#22c55e" : "#f87171" }}>
                    {t.amount > 0 ? "+" : "-"}Rs. {Math.abs(t.amount).toLocaleString()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}

function categoryEmoji(cat: string) {
  const map: Record<string, string> = {
    "Food": "🍽️", "House Rent": "🏠", "Transport": "🚗",
    "Shopping": "🛍️", "Entertainment": "🎬", "Health": "💊",
    "Utilities": "💡", "Education": "📚", "Savings": "🏦", "Other": "📌",
  };
  return map[cat] ?? "💸";
}