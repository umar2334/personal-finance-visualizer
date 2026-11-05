import { lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { Layout } from "@/components/Layout";
import { AuthProvider } from "@/context/AuthContext";
import { FinanceProvider } from "@/context/FinanceContext";
import { PrefsProvider, usePrefs } from "@/context/PrefsContext";
import { ForgotPassword, Login, NewPassword, Register } from "@/pages/Auth";
import { NotFound, RouteError } from "@/pages/Errors";

// Lazy so the charting library only downloads with the dashboard.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Transactions = lazy(() => import("@/pages/Transactions"));
const Budgets = lazy(() => import("@/pages/Budgets"));
const Settings = lazy(() => import("@/pages/Settings"));

const router = createBrowserRouter([
  { path: "/login", Component: Login, errorElement: <RouteError /> },
  { path: "/register", Component: Register, errorElement: <RouteError /> },
  { path: "/forgot-password", Component: ForgotPassword, errorElement: <RouteError /> },
  { path: "/new-password", Component: NewPassword, errorElement: <RouteError /> },
  {
    path: "/",
    Component: Layout,
    errorElement: <RouteError />,
    children: [
      { index: true, Component: Dashboard },
      { path: "transactions", Component: Transactions },
      { path: "budgets", Component: Budgets },
      { path: "settings", Component: Settings },
    ],
  },
  { path: "*", Component: NotFound },
]);

function Toasts() {
  const { resolvedTheme, lang } = usePrefs();
  return <Toaster theme={resolvedTheme} richColors dir={lang === "ur" ? "rtl" : "ltr"} position="top-center" />;
}

export default function App() {
  return (
    <PrefsProvider>
      <AuthProvider>
        <FinanceProvider>
          <RouterProvider router={router} />
          <Toasts />
        </FinanceProvider>
      </AuthProvider>
    </PrefsProvider>
  );
}
