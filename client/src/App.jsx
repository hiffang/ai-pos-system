import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./MainLayout";
import POSTerminal from "./components/POS/POSTerminal";
import Dashboard from "./components/Dashboard/Dashboard";
import Inventory from "./pages/Inventory";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Login from "./pages/Login";
import AuthGuard from "./components/AuthGuard";
import { useAuthStore } from "./store/authStore";

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <AuthGuard>
              <MainLayout />
            </AuthGuard>
          }
        >
          <Route path="/pos" element={<POSTerminal />} />
          <Route
            path="/dashboard"
            element={
              <AuthGuard minRole="MANAGER">
                <Dashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/inventory"
            element={
              <AuthGuard minRole="MANAGER">
                <Inventory />
              </AuthGuard>
            }
          />
          <Route path="/settings" element={<Settings />} />
          <Route path="/users" element={<Navigate to="/settings" replace />} />
          <Route path="/help" element={<Help />} />
          <Route path="/" element={<Navigate to="/pos" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
