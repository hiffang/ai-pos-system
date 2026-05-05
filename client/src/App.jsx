import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./MainLayout";
import POSTerminal from "./components/POS/POSTerminal";
import Dashboard from "./components/Dashboard/Dashboard";
import Inventory from "./pages/Inventory";
import CustomerCredit from "./pages/CustomerCredit";
import Settings from "./pages/Settings";
import Help from "./pages/Help";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/pos" element={<POSTerminal />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/credit" element={<CustomerCredit />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          <Route path="/" element={<Navigate to="/pos" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
