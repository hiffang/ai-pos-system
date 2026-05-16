import { useNavigate, useLocation } from "react-router-dom";

const navItems = [
  { path: "/pos", icon: "point_of_sale", label: "POS Terminal" },
  { path: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { path: "/inventory", icon: "inventory_2", label: "Inventory" },
  { path: "/settings", icon: "settings", label: "Settings" },
];

const bottomItems = [
  { path: "/help", icon: "help", label: "Help" },
  { path: "/logout", icon: "logout", label: "Logout" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path) => currentPath === path;

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-60 bg-gray-50 border-r border-gray-200 flex flex-col py-4 text-sm font-medium z-40">
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
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
      <div className="mt-auto border-t border-gray-200 pt-4 space-y-1">
        {bottomItems.map((item) => (
          <button
            key={item.path}
            onClick={() => {
              if (item.path === "/logout") {
                console.log("Logout clicked");
                // TODO: Implement logout logic
              } else {
                navigate(item.path);
              }
            }}
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
      </div>
    </aside>
  );
}
