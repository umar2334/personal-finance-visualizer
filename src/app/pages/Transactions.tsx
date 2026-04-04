import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useTransactions } from "../context/TransactionContext";
import { TransactionModal } from "../components/TransactionModal";
import { Transaction } from "../types";
import { ALL_CATEGORIES, CATEGORY_COLORS } from "../data/mockData";

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-[#0d1426] border border-white/10 rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl"
      >
        <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-red-400" />
        </div>
        <h3 className="text-white mb-1 font-semibold">Delete Entry?</h3>
        <p className="text-slate-400 text-sm mb-5">
          "<span className="text-white">{name}</span>" will be deleted permanently.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-all">
            Go Back
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold transition-all">
            Yes, Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function Transactions() {
  const { transactions, addTransaction, editTransaction, deleteTransaction } = useTransactions();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch]         = useState("");
  const [catFilter, setCatFilter]   = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const [showModal, setShowModal]   = useState(false);
  const [editTx, setEditTx]         = useState<Transaction | null>(null);
  const [deleteTx, setDeleteTx]     = useState<Transaction | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowModal(true);
      setSearchParams({}, { replace: true });
    }
  }, []);

  const filtered = useMemo(() => {
    return transactions
      .filter((tx) => {
        const q = search.toLowerCase();
        const matchSearch = tx.description.toLowerCase().includes(q) || tx.category.toLowerCase().includes(q);
        const matchCat    = catFilter === "All" || tx.category === catFilter;
        const matchType   = typeFilter === "All" || (typeFilter === "income" ? tx.amount > 0 : tx.amount < 0);
        return matchSearch && matchCat && matchType;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [transactions, search, catFilter, typeFilter]);

  const totalIncome  = filtered.filter((tx) => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const totalExpense = filtered.filter((tx) => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-[#0d1426] border border-white/8 rounded-xl px-3 py-2.5 flex-1 min-w-[180px]">
          <Search size={14} className="text-slate-500 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries..."
            className="bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none flex-1"
          />
        </div>

        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="bg-[#0d1426] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none"
        >
          <option value="All" className="bg-[#0d1426]">All Categories</option>
          {ALL_CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#0d1426]">{c}</option>)}
        </select>

        <div className="flex gap-1 bg-[#0d1426] border border-white/8 rounded-xl p-1">
          {(["All", "income", "expense"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setTypeFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                typeFilter === v ? "bg-white/10 text-white font-semibold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {v === "All" ? "All" : v === "income" ? "💰 Income" : "💸 Expense"}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setEditTx(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 ml-auto"
        >
          <Plus size={15} />
          New Entry
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Entries",  value: String(filtered.length),               color: "#94a3b8" },
          { label: "Total Income",   value: `Rs. ${totalIncome.toLocaleString()}`,  color: "#22c55e" },
          { label: "Total Expense",  value: `Rs. ${totalExpense.toLocaleString()}`, color: "#f87171" },
        ].map((s) => (
          <div key={s.label} className="bg-[#0d1426] border border-white/5 rounded-xl px-4 py-3 text-center">
            <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Transaction list */}
      <div className="bg-[#0d1426] border border-white/5 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-500 text-sm">No entries found</p>
            <button
              onClick={() => { setEditTx(null); setShowModal(true); }}
              className="mt-3 text-blue-400 text-sm hover:text-blue-300 transition-colors"
            >
              + Add first entry
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/4">
            <AnimatePresence>
              {filtered.map((tx, i) => {
                const color = CATEGORY_COLORS[tx.category] || "#64748b";
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="group flex items-center gap-3 px-4 py-3.5 hover:bg-white/3 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
                      {tx.amount > 0 ? "💰" : categoryEmoji(tx.category)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${color}18`, color, border: `1px solid ${color}25` }}>
                          {tx.category}
                        </span>
                        <span className="text-xs text-slate-600">
                          {new Date(tx.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        {tx.amount > 0
                          ? <TrendingUp size={13} className="text-emerald-500" />
                          : <TrendingDown size={13} className="text-red-500" />
                        }
                        <span className="text-sm font-bold" style={{ color: tx.amount > 0 ? "#22c55e" : "#f87171" }}>
                          {tx.amount > 0 ? "+" : "-"}Rs. {Math.abs(tx.amount).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => { setEditTx(tx); setShowModal(true); }}
                        className="w-8 h-8 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 flex items-center justify-center transition-all"
                      >
                        <Pencil size={13} className="text-blue-400" />
                      </button>
                      <button
                        onClick={() => setDeleteTx(tx)}
                        className="w-8 h-8 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 flex items-center justify-center transition-all"
                      >
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {showModal && (
        <TransactionModal
          mode={editTx ? "edit" : "add"}
          existing={editTx ?? undefined}
          onClose={() => { setShowModal(false); setEditTx(null); }}
          onSave={(data) => {
            if (editTx) editTransaction(editTx.id, data);
            else addTransaction(data);
          }}
        />
      )}

      {deleteTx && (
        <DeleteConfirm
          name={deleteTx.description}
          onConfirm={() => { deleteTransaction(deleteTx.id); setDeleteTx(null); }}
          onCancel={() => setDeleteTx(null)}
        />
      )}
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
