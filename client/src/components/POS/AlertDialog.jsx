export default function AlertDialog({
  isOpen,
  title,
  message,
  tone = "info",
  onClose,
}) {
  if (!isOpen) return null;

  const toneStyles = {
    info: "bg-blue-50 text-blue-700",
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-800",
    error: "bg-red-50 text-red-700",
  };

  const badgeClass = toneStyles[tone] || toneStyles.info;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-sm p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p
              className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold uppercase ${badgeClass}`}
            >
              {tone}
            </p>
            <h3 className="text-lg font-bold text-gray-900 mt-2">{title}</h3>
          </div>
          <button
            className="text-gray-500 hover:text-gray-800 text-xl leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-700">{message}</p>

        <div className="mt-6 flex justify-end">
          <button
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
