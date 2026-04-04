import {
  createContext, useContext, useState, useEffect, ReactNode, useCallback,
} from "react";
import { Transaction } from "../types";
import { getDefaultTransactions } from "../data/mockData";
import { useAuth } from "./AuthContext";

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, "id" | "user_id" | "created_at">) => void;
  editTransaction: (id: string, t: Omit<Transaction, "id" | "user_id" | "created_at">) => void;
  deleteTransaction: (id: string) => void;
}

const TxContext = createContext<TransactionContextType | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load from localStorage or seed defaults when user changes
  useEffect(() => {
    if (!user) { setTransactions([]); return; }
    const key = `finance_transactions_${user.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setTransactions(JSON.parse(saved));
    } else {
      const defaults = getDefaultTransactions(user.id);
      setTransactions(defaults);
      localStorage.setItem(key, JSON.stringify(defaults));
    }
  }, [user]);

  const persist = useCallback((list: Transaction[]) => {
    if (!user) return;
    localStorage.setItem(`finance_transactions_${user.id}`, JSON.stringify(list));
  }, [user]);

  const addTransaction = (data: Omit<Transaction, "id" | "user_id" | "created_at">) => {
    const newTx: Transaction = {
      ...data,
      id: `tx-${Date.now()}`,
      user_id: user!.id,
      created_at: new Date().toISOString(),
    };
    setTransactions((prev) => {
      const updated = [newTx, ...prev];
      persist(updated);
      return updated;
    });
  };

  const editTransaction = (id: string, data: Omit<Transaction, "id" | "user_id" | "created_at">) => {
    setTransactions((prev) => {
      const updated = prev.map((t) => t.id === id ? { ...t, ...data } : t);
      persist(updated);
      return updated;
    });
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      persist(updated);
      return updated;
    });
  };

  return (
    <TxContext.Provider value={{ transactions, addTransaction, editTransaction, deleteTransaction }}>
      {children}
    </TxContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TxContext);
  if (!ctx) throw new Error("useTransactions must be used within TransactionProvider");
  return ctx;
}
