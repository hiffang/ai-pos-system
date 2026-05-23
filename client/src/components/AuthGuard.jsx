import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

/**
 * Wrap a route to require an authenticated user, optionally with a minimum role.
 *
 *   <AuthGuard><POSTerminal /></AuthGuard>                  // any logged-in user
 *   <AuthGuard minRole="MANAGER"><Dashboard /></AuthGuard>  // manager or admin
 *   <AuthGuard minRole="ADMIN"><UserMgmt /></AuthGuard>     // admin only
 *
 * Renders nothing while the auth store is still initializing (avoids a
 * login-page flash on cold start when a valid token already exists).
 */
export default function AuthGuard({ children, minRole = "CASHIER" }) {
  const user = useAuthStore((s) => s.user);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const hasRole = useAuthStore((s) => s.hasRole);
  const location = useLocation();

  if (isInitializing) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!hasRole(minRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Access restricted
          </h2>
          <p className="text-gray-600">
            This area requires the {minRole} role or higher. You're signed in as{" "}
            {user.role}.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
