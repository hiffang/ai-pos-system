import { useState } from "react";
import { changePassword } from "../../store/apiClient";
import { useAuthStore } from "../../store/authStore";

const MIN_PASSWORD_LENGTH = 8;

const ROLE_LABELS = {
  CASHIER: "Cashier",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

export default function AccountSection() {
  const user = useAuthStore((s) => s.user);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      reset();
    } catch (err) {
      setError(err.message || "Password change failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Account</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs uppercase text-gray-500 font-semibold">Name</dt>
            <dd className="text-gray-900 mt-0.5">{user?.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500 font-semibold">Email</dt>
            <dd className="text-gray-900 mt-0.5">{user?.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500 font-semibold">Role</dt>
            <dd className="text-gray-900 mt-0.5">
              {ROLE_LABELS[user?.role] || user?.role || "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Change password
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Your current session stays active after changing — the new password
          is only required on your next sign-in.
        </p>

        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              disabled={isSubmitting}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              disabled={isSubmitting}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
              Password changed successfully.
            </p>
          ) : null}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Changing…" : "Change password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
