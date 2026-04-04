import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { useAuth } from "./context/AuthContext";
import { JSX } from "react";

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#060d1f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function ProtectedLayout() {
  return (
    <Protected>
      <Layout />
    </Protected>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/",
    Component: ProtectedLayout,
    children: [
      { index: true,          Component: Dashboard     },
      { path: "transactions", Component: Transactions  },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
