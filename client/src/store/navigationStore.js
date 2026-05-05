import { create } from "zustand";

export const useNavigationStore = create((set) => ({
  activeRoute: "/pos",
  setActiveRoute: (route) => set({ activeRoute: route }),
}));
