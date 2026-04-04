import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "motion/react";
import { Eye, EyeOff, TrendingUp, Mail, Lock, User, AlertCircle, ArrowRight, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) return setError("Passwords match nahi kar rahe!");
    if (password.length < 6) return setError("Password kam se kam 6 characters ka hona chahiye");
    setLoading(true);
    const result = await register(email, password, name);
    setLoading(false);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    } else {
      setError(result.error || "Registration failed");
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await loginWithGoogle();
    setGoogleLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#060d1f] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)" }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #a855f7, transparent 70%)" }} />

      <div className="w-full max-w-sm relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <TrendingUp size={24} className="text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">FinanceSync</h1>
          <p className="text-slate-400 text-sm mt-1">Apna account banayein</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#0d1426] border border-white/8 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-white font-semibold text-lg mb-1">Register</h2>
          <p className="text-slate-500 text-sm mb-6">Naya account banayein</p>

          {success ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle size={48} className="text-green-400" />
              <p className="text-white font-semibold">Account ban gaya!</p>
              <p className="text-slate-400 text-sm">Email check karein confirmation ke liye. Redirect ho raha hai...</p>
            </motion.div>
          ) : (
            <>
              <button onClick={handleGoogle} disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:opacity-60 text-gray-800 rounded-xl py-3 text-sm font-semibold transition-all mb-4">
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.77-2.7.77-2.08 0-3.84-1.4-4.47-3.29H1.84v2.07A8 8 0 0 0 8.98 17z"/>
                    <path fill="#FBBC05" d="M4.51 10.53A4.8 4.8 0 0 1 4.26 9c0-.53.09-1.04.25-1.53V5.4H1.84A8 8 0 0 0 .98 9c0 1.29.31 2.51.86 3.6l2.67-2.07z"/>
                    <path fill="#EA4335" d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.14 4.4l2.67 2.07c.63-1.89 2.39-3.29 4.47-3.29z"/>
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-slate-600 text-xs">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Full Name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Ali Hassan"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="ali@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type={showPass ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 transition-all" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 transition-all" />
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                    <AlertCircle size={14} />{error}
                  </motion.div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 disabled:opacity-60 text-white rounded-xl py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                  {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</> : <>Register <ArrowRight size={15} /></>}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-slate-500 mt-5">
            Pehle se account hai?{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Login karo
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}