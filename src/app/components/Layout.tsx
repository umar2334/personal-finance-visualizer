import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { LayoutDashboard, List, TrendingUp, LogOut, Menu, PiggyBank } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

const navItems = [
  { to: "/",             label: "Dashboard",    icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: List            },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-[#060d1f] text-white overflow-hidden">
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed lg:relative z-50 h-full flex flex-col
        bg-[#0a1220] border-r border-white/5 w-[230px]
        transition-transform duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
            <TrendingUp size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-bold">FinanceSync</p>
            <p className="text-xs text-slate-500">Personal Finance</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                ${isActive
                  ? "bg-blue-600/15 border border-blue-500/25 text-blue-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className="flex-shrink-0" />
                  <p className={`text-sm leading-tight ${isActive ? "font-semibold" : ""}`}>{label}</p>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mx-3 mb-3 bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-blue-500/15 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank size={14} className="text-blue-400" />
            <span className="text-xs text-slate-400">Quick tip</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Track every expense daily — small savings add up big! 💪
          </p>
        </div>

        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs text-white flex-shrink-0 font-bold">
              {user?.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate font-semibold">
                {user?.user_metadata?.full_name || "User"}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/15 hover:border-red-500/20 border border-transparent flex items-center justify-center transition-all group"
              title="Logout"
            >
              <LogOut size={13} className="text-slate-500 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 bg-[#060d1f] lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <TrendingUp size={12} className="text-white" />
            </div>
            <span className="text-white text-sm font-semibold">FinanceSync</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
