import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const isLoggingIn = useAuthStore((s) => s.isLoggingIn);
  const loginError = useAuthStore((s) => s.loginError);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const redirectTo = location.state?.from || "/pos";

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch {
      // Error is already stored on the auth store; nothing else to do here.
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-8">
        <div className="text-center mb-6">
          <div className="text-2xl font-black text-[#1D9E75]">CeylonPOS</div>
          <p className="text-sm text-gray-500 mt-1">Sign in to continue</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              autoComplete="username"
              autoFocus
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {loginError ? (
            <p className="text-sm text-red-600">{loginError}</p>
          ) : null}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full h-11 bg-[#1D9E75] text-white rounded-lg font-semibold hover:brightness-95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-400 text-center leading-relaxed">
          Default dev users:
          <br />
          admin@shop.lk · manager@shop.lk · cashier@shop.lk
          <br />
          Password: role + "123"
        </div>
      </div>
    </div>
  );
}
