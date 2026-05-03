export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-60 bg-gray-50 border-r border-gray-200 flex flex-col py-4 text-sm font-medium z-40">
      <div className="px-6 mb-6">
        <div className="text-lg font-black text-[#1D9E75]">CeylonPOS Admin</div>
        <div className="text-xs text-gray-500">Colombo Branch</div>
      </div>
      <nav className="flex-1 space-y-1">
        <div className="bg-white text-[#1D9E75] shadow-sm rounded-lg mx-2 flex items-center gap-3 px-4 py-3 cursor-pointer transition-all">
          <span className="material-symbols-outlined">point_of_sale</span>
          <span>POS Terminal</span>
        </div>
        <div className="text-gray-500 mx-2 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center gap-3 px-4 py-3 cursor-pointer transition-all">
          <span className="material-symbols-outlined">dashboard</span>
          <span>Dashboard</span>
        </div>
        <div className="text-gray-500 mx-2 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center gap-3 px-4 py-3 cursor-pointer transition-all">
          <span className="material-symbols-outlined">inventory_2</span>
          <span>Inventory</span>
        </div>
        <div className="text-gray-500 mx-2 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center gap-3 px-4 py-3 cursor-pointer transition-all">
          <span className="material-symbols-outlined">payments</span>
          <span>Customer Credit</span>
        </div>
        <div className="text-gray-500 mx-2 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center gap-3 px-4 py-3 cursor-pointer transition-all">
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </div>
      </nav>
      <div className="mt-auto border-t border-gray-200 pt-4 space-y-1">
        <div className="text-gray-500 mx-2 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center gap-3 px-4 py-3 cursor-pointer transition-all">
          <span className="material-symbols-outlined">help</span>
          <span>Help</span>
        </div>
        <div className="text-gray-500 mx-2 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center gap-3 px-4 py-3 cursor-pointer transition-all">
          <span className="material-symbols-outlined">logout</span>
          <span>Logout</span>
        </div>
      </div>
    </aside>
  );
}
