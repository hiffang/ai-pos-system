import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const navItems = [
  { path: "/pos", icon: "point_of_sale", label: "POS Terminal", minRole: "CASHIER" },
  { path: "/dashboard", icon: "dashboard", label: "Dashboard", minRole: "MANAGER" },
  { path: "/inventory", icon: "inventory_2", label: "Inventory", minRole: "MANAGER" },
  { path: "/transactions", icon: "receipt_long", label: "Transactions", minRole: "CASHIER" },
  { path: "/settings", icon: "settings", label: "Settings", minRole: "CASHIER" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasRole = useAuthStore((s) => s.hasRole);
  const currentPath = location.pathname;

  const isActive = (path) => currentPath === path;
  const visibleItems = navItems.filter((item) => hasRole(item.minRole));

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-60 bg-gray-50 border-r border-gray-200 flex flex-col py-4 text-sm font-medium z-40">
      <nav className="flex-1 space-y-1">
        {visibleItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`w-full text-left mx-2 rounded-lg flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
              isActive(item.path)
                ? "bg-white text-[#1D9E75] shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
