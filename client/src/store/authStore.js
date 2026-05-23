import { create } from "zustand";
import {
  login as apiLogin,
  logout as apiLogout,
  fetchMe,
  getAuthToken,
} from "./apiClient";

const ROLE_RANK = { CASHIER: 1, MANAGER: 2, ADMIN: 3 };

/**
 * @typedef {Object} AuthUser
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {"CASHIER"|"MANAGER"|"ADMIN"} role
 */

export const useAuthStore = create((set, get) => ({
  /** @type {AuthUser | null} */
  user: null,
  /** true on mount until we've verified the stored token */
  isInitializing: true,
  /** true while a login request is in flight */
  isLoggingIn: false,
  /** @type {string | null} */
  loginError: null,

  /**
   * Called once at app start. If a token is stored, verifies it against
   * /api/auth/me and hydrates the user. If invalid, the apiClient has
   * already cleared it.
   */
  async initialize() {
    if (!getAuthToken()) {
      set({ isInitializing: false, user: null });
      return;
    }
    const user = await fetchMe();
    set({ user, isInitializing: false });
  },

  async login(email, password) {
    set({ isLoggingIn: true, loginError: null });
    try {
      const user = await apiLogin(email, password);
      set({ user, isLoggingIn: false });
      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ loginError: message, isLoggingIn: false });
      throw error;
    }
  },

  logout() {
    apiLogout();
    set({ user: null });
  },

  /** @param {"CASHIER"|"MANAGER"|"ADMIN"} minRole */
  hasRole(minRole) {
    const user = get().user;
    if (!user) return false;
    return (ROLE_RANK[user.role] || 0) >= (ROLE_RANK[minRole] || 0);
  },
}));
