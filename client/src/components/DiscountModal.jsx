import { useState, useEffect } from "react";
import { createDiscount } from "../store/apiClient";

/**
 * Self-contained discount creation modal — shared between the Inventory
 * page (per-product "+ Add" action) and the Dashboard's PromotionsPanel
 * ("Create Discount" on a recommendation), so the form/validation/API call
 * logic lives in exactly one place.
 *
 * @param {{
 *   target: { id: string, name: string } | null,
 *   prefill?: { suggestedValue?: number, suggestedReason?: string },
 *   onClose: () => void,
 *   onSaved: () => void,
 * }} props
 */
export default function DiscountModal({ target, prefill, onClose, onSaved }) {
  const [form, setForm] = useState({ type: "PERCENTAGE", value: "", reason: "", endDate: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setForm({
      type: "PERCENTAGE",
      value: prefill?.suggestedValue?.toString() || "",
      reason: prefill?.suggestedReason || "",
      endDate: "",
    });
    setError("");
  }, [target, prefill]);

  if (!target) return null;

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    const parsedValue = parseFloat(form.value);
    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
      setError("Enter a discount value greater than 0.");
      return;
    }
    if (form.type === "PERCENTAGE" && parsedValue > 100) {
      setError("Percentage discount cannot exceed 100.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await createDiscount({
        productId: target.id,
        type: form.type,
        value: parsedValue,
        reason: form.reason.trim() || undefined,
        endDate: form.endDate || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err.message || "Failed to create discount.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Add Discount
            <span className="block text-sm font-normal text-gray-500 mt-0.5">
              {target.name}
            </span>
          </h3>
          <button className="text-gray-500 hover:text-gray-800" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={form.type}
                onChange={(e) => handleChange("type", e.target.value)}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed amount (LKR)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Value</label>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder={form.type === "PERCENTAGE" ? "e.g. 15" : "e.g. 50"}
                value={form.value}
                onChange={(e) => handleChange("value", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reason
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Overstock clearance"
              value={form.reason}
              onChange={(e) => handleChange("reason", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              End date
              <span className="text-gray-400 font-normal ml-1">(optional — leave blank for open-ended)</span>
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={form.endDate}
              onChange={(e) => handleChange("endDate", e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Apply Discount"}
          </button>
        </div>
      </div>
    </div>
  );
}
