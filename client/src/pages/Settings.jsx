import { useState } from "react";
import AccountSection from "../components/Settings/AccountSection";
import UsersSection from "../components/Settings/UsersSection";
import DiagnosticsSection from "../components/Settings/DiagnosticsSection";
import { useAuthStore } from "../store/authStore";

export default function Settings() {
  const hasRole = useAuthStore((s) => s.hasRole);
  const isAdmin = hasRole("ADMIN");

  // Each tab is { key, label, icon, render }. Filtered by role before render.
  const allTabs = [
    {
      key: "account",
      label: "Account",
      icon: "person",
      render: () => <AccountSection />,
      minRole: "CASHIER",
    },
    {
      key: "diagnostics",
      label: "Diagnostics",
      icon: "monitoring",
      render: () => <DiagnosticsSection />,
      minRole: "MANAGER",
    },
    {
      key: "users",
      label: "Users",
      icon: "group",
      render: () => <UsersSection />,
      minRole: "ADMIN",
    },
  ];
  const tabs = allTabs.filter((tab) => hasRole(tab.minRole));
  const [activeKey, setActiveKey] = useState(tabs[0]?.key || "account");
  const active = tabs.find((tab) => tab.key === activeKey) || tabs[0];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">
          Manage your account{isAdmin ? " and shop users" : ""}.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <nav className="col-span-12 md:col-span-3 lg:col-span-2">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.key}>
                <button
                  onClick={() => setActiveKey(tab.key)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active?.key === tab.key
                      ? "bg-white text-[#1D9E75] shadow-sm"
                      : "text-gray-600 hover:bg-white hover:text-gray-900"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="col-span-12 md:col-span-9 lg:col-span-10">
          {active ? active.render() : null}
        </div>
      </div>
    </div>
  );
}
