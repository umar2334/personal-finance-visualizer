import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { toast } from "sonner";
import { Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { usePrefs } from "@/context/PrefsContext";
import { googleAuthEnabled } from "@/lib/supabase";

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function Shell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  const { t } = usePrefs();
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <img src="/favicon.svg" alt="" className="size-8" />{t("app_name")}
        </Link>
        <div className="card p-6">
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 mb-4 text-sm text-muted">{subtitle}</p>}
          {children}
        </div>
        {footer && <div className="mt-4 space-y-2 text-center text-sm text-muted">{footer}</div>}
      </div>
    </main>
  );
}

function FormError({ message }: { message: string }) {
  if (!message) return null;
  return <p role="alert" className="rounded-lg bg-expense-soft p-3 text-sm text-expense">{message}</p>;
}

/** Accounts are optional, so without Supabase these pages explain that instead of failing. */
function CloudGate({ children }: { children: ReactNode }) {
  const { t } = usePrefs();
  const { cloudEnabled, loading, user } = useAuth();
  if (loading) return <Spinner label={t("loading")} />;
  if (user) return <Navigate to="/" replace />;
  if (!cloudEnabled) {
    return (
      <Shell title={t("cloud_off_title")} subtitle={t("cloud_off_body")}>
        <Link to="/" className="btn-primary w-full">{t("continue_guest")}</Link>
      </Shell>
    );
  }
  return <>{children}</>;
}

function GoogleButton() {
  const { t } = usePrefs();
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState("");
  if (!googleAuthEnabled) return null;
  return (
    <div className="mb-4">
      <FormError message={error} />
      <button type="button" className="btn-secondary w-full" onClick={async () => {
        const r = await loginWithGoogle();
        if (!r.ok) setError(r.error);
      }}>{t("continue_google")}</button>
      <p className="mt-4 text-center text-xs text-muted">{t("or")}</p>
    </div>
  );
}

export function Login() {
  const { t } = usePrefs();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validEmail(email)) return setError(t("err_email"));
    if (!password) return setError(t("err_password"));
    setBusy(true);
    setError("");
    const r = await login(email.trim(), password);
    setBusy(false);
    if (!r.ok) setError(r.error);
  };

  return (
    <CloudGate>
      <Shell
        title={t("login_title")}
        subtitle={t("login_sub")}
        footer={<>
          <p>{t("no_account")} <Link to="/register" className="font-medium text-primary hover:underline">{t("create_account")}</Link></p>
          <p><Link to="/" className="hover:underline">{t("continue_guest")}</Link></p>
        </>}
      >
        <GoogleButton />
        <form onSubmit={submit} noValidate className="space-y-3">
          <FormError message={error} />
          <div>
            <label htmlFor="email" className="label">{t("email")}</label>
            <input id="email" className="field" dir="ltr" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="password" className="label">{t("password")}</label>
            <input id="password" className="field" dir="ltr" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <p className="text-end text-sm"><Link to="/forgot-password" className="text-primary hover:underline">{t("forgot_password")}</Link></p>
          <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? t("working") : t("sign_in")}</button>
        </form>
      </Shell>
    </CloudGate>
  );
}

export function Register() {
  const { t } = usePrefs();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError(t("err_name"));
    if (!validEmail(email)) return setError(t("err_email"));
    if (password.length < 8) return setError(t("err_password"));
    setBusy(true);
    setError("");
    const r = await register(email.trim(), password, name.trim());
    setBusy(false);
    if (!r.ok) setError(r.error);
    else if (r.needsConfirmation) setConfirmSent(true);
  };

  if (confirmSent) {
    return (
      <Shell title={t("register_title")} footer={<Link to="/login" className="text-primary hover:underline">{t("back_to_login")}</Link>}>
        <p role="status" className="mt-3 text-sm">{t("check_email")}</p>
      </Shell>
    );
  }

  return (
    <CloudGate>
      <Shell
        title={t("register_title")}
        subtitle={t("register_sub")}
        footer={<>
          <p>{t("have_account")} <Link to="/login" className="font-medium text-primary hover:underline">{t("sign_in")}</Link></p>
          <p><Link to="/" className="hover:underline">{t("continue_guest")}</Link></p>
        </>}
      >
        <GoogleButton />
        <form onSubmit={submit} noValidate className="space-y-3">
          <FormError message={error} />
          <div>
            <label htmlFor="name" className="label">{t("full_name")}</label>
            <input id="name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="email" className="label">{t("email")}</label>
            <input id="email" className="field" dir="ltr" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="password" className="label">{t("password")}</label>
            <input id="password" className="field" dir="ltr" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="mt-1 text-xs text-muted">{t("password_hint")}</p>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? t("working") : t("create_account")}</button>
        </form>
      </Shell>
    </CloudGate>
  );
}

export function ForgotPassword() {
  const { t } = usePrefs();
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validEmail(email)) return setError(t("err_email"));
    setError("");
    const r = await sendPasswordReset(email.trim());
    // Same message whether or not the account exists, so this page can't reveal who has signed up.
    if (r.ok) setSent(true);
    else setError(r.error);
  };

  return (
    <CloudGate>
      <Shell title={t("reset_title")} subtitle={t("reset_sub")} footer={<Link to="/login" className="text-primary hover:underline">{t("back_to_login")}</Link>}>
        {sent ? <p role="status" className="text-sm">{t("reset_sent")}</p> : (
          <form onSubmit={submit} noValidate className="space-y-3">
            <FormError message={error} />
            <div>
              <label htmlFor="email" className="label">{t("email")}</label>
              <input id="email" className="field" dir="ltr" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full">{t("send_link")}</button>
          </form>
        )}
      </Shell>
    </CloudGate>
  );
}

/** Reached from the reset email, which signs the user in, so this isn't behind CloudGate. */
export function NewPassword() {
  const { t } = usePrefs();
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError(t("err_password"));
    const r = await updatePassword(password);
    if (!r.ok) return setError(r.error);
    toast.success(t("password_updated"));
    navigate("/", { replace: true });
  };

  return (
    <Shell title={t("new_password_title")}>
      <form onSubmit={submit} noValidate className="mt-4 space-y-3">
        <FormError message={error} />
        <div>
          <label htmlFor="password" className="label">{t("new_password")}</label>
          <input id="password" className="field" dir="ltr" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="mt-1 text-xs text-muted">{t("password_hint")}</p>
        </div>
        <button type="submit" className="btn-primary w-full">{t("update_password")}</button>
      </form>
    </Shell>
  );
}
