import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check } from "lucide-react";
import { Transaction } from "../types";
import { ALL_CATEGORIES, CATEGORY_COLORS } from "../data/mockData";

interface Props {
  mode: "add" | "edit";
  existing?: Transaction;
  onClose: () => void;
  onSave: (data: Omit<Transaction, "id" | "user_id" | "created_at">) => void;
}

export function TransactionModal({ mode, existing, onClose, onSave }: Props) {
  const [type, setType] = useState<"income" | "expense">(
    existing ? (existing.amount > 0 ? "income" : "expense") : "expense"
  );
  const [description, setDescription] = useState(existing?.description ?? "");
  const [amount, setAmount] = useState(existing ? String(Math.abs(existing.amount)) : "");
  const [category, setCategory] = useState(existing?.category ?? "Food");

  const incomeCategories = ["Salary", "Freelance"];
  const expenseCategories = ALL_CATEGORIES.filter((c) => !incomeCategories.includes(c));

  useEffect(() => {
    if (type === "income" && !incomeCategories.includes(category)) setCategory("Salary");
    if (type === "expense" && incomeCategories.includes(category)) setCategory("Food");
  }, [type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    onSave({
      amount: type === "income" ? num : -num,
      category,
      description: description.trim(),
    });
    onClose();
  };

  const categories = type === "income" ? incomeCategories : expenseCategories;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative bg-[#0d1426] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white" style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              {mode === "add" ? "Add Transaction" : "Edit Transaction"}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Income / Expense toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-black/30 rounded-xl">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`py-2.5 rounded-lg text-sm transition-all ${
                  type === "expense"
                    ? "bg-red-500/20 border border-red-500/40 text-red-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
                style={{ fontWeight: 600 }}
              >
                💸 Expense
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`py-2.5 rounded-lg text-sm transition-all ${
                  type === "income"
                    ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
                style={{ fontWeight: 600 }}
              >
                💰 Income
              </button>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">
                {type === "expense" ? "What did you spend on?" : "What is this income for?"}
              </label>
              <input
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === "expense" ? "e.g. Groceries, Rent..." : "e.g. Monthly salary..."}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rs.</span>
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs text-slate-400 block mb-2">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`relative px-2 py-2 rounded-xl text-xs transition-all border ${
                      category === cat
                        ? "border-transparent"
                        : "bg-white/3 border-white/8 text-slate-400 hover:bg-white/6 hover:text-white"
                    }`}
                    style={
                      category === cat
                        ? {
                            background: `${CATEGORY_COLORS[cat]}20`,
                            borderColor: `${CATEGORY_COLORS[cat]}50`,
                            color: CATEGORY_COLORS[cat],
                          }
                        : {}
                    }
                  >
                    {category === cat && (
                      <Check size={10} className="absolute top-1.5 right-1.5" style={{ color: CATEGORY_COLORS[cat] }} />
                    )}
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm text-white transition-all mt-2"
              style={{
                background: type === "income"
                  ? "linear-gradient(135deg, #22c55e, #16a34a)"
                  : "linear-gradient(135deg, #3b82f6, #6366f1)",
                fontWeight: 600,
                boxShadow: type === "income"
                  ? "0 4px 20px rgba(34,197,94,0.25)"
                  : "0 4px 20px rgba(59,130,246,0.25)",
              }}
            >
              {mode === "add" ? "Save Transaction" : "Save Changes"}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
