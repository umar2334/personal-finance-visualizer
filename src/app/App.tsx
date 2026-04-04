import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { TransactionProvider } from "./context/TransactionContext";

export default function App() {
  return (
    <AuthProvider>
      <TransactionProvider>
        <RouterProvider router={router} />
      </TransactionProvider>
    </AuthProvider>
  );
}
