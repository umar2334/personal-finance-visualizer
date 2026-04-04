import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./app/context/AuthContext";
import { LangProvider } from "./app/context/LangContext";
import { TransactionProvider } from "./app/context/TransactionContext";

export default function App() {
  return (
    <AuthProvider>
      <LangProvider>
        <TransactionProvider>
          <RouterProvider router={router} />
        </TransactionProvider>
      </LangProvider>
    </AuthProvider>
  );
}
