import { Outlet } from "react-router-dom";
import Header from "./components/POS/Header";
import Sidebar from "./components/POS/Sidebar";

export default function MainLayout() {
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="ml-60 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
