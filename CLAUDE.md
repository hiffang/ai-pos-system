# POS System — project context

## Stack

- Node.js + Express backend (server/)
- React + Vite frontend (client/)
- Electron desktop wrapper (electron/)
- Prisma ORM with SQLite (local, single file at prisma/pos.db) + Supabase (cloud sync)
  - SQLite has no enum or Json support — `Role`, `PaymentMethod`, `PaymentStatus` are
    stored as String columns; `Outbox.payload` and `AuditLog.metadata` are JSON-stringified Strings
  - SQLite has no `mode: "insensitive"` filter — use raw SQL with `COLLATE NOCASE` for
    case-insensitive equality, or rely on SQLite's default ASCII-CI `LIKE` for `contains`
- Zustand for client state, Tailwind for styling

## Key patterns

- All DB writes use localWrite() from server/services/syncEngine.js
  to ensure outbox entries are always created atomically
- Payment logic lives in server/services/paymentHandler.js — routes
  only call processPayment() and return the result
- AI inference uses a model registry in server/services/aiInference.js
  with a heuristic adapter fallback (no ONNX dependency wired yet)

## Conventions

- LKR currency always formatted with toLocaleString('en-LK')
- All route handlers use try/catch and the central errorHandler middleware
- Prisma client is a singleton exported from server/db.js
- Environment variables are validated on startup in server/index.js

## Target market

Sri Lankan small grocery shops. Offline-first is a hard requirement.
Payment methods: Cash, PayHere (cards/wallets), OnePay (LankaQR),
bank transfer (manual).
