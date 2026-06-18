<div align="center">

# AI POS System

**Offline-first point-of-sale terminal for Sri Lankan small grocery shops**
<img width="1906" height="880" alt="image" src="https://github.com/user-attachments/assets/f1fa749b-6b7f-40ee-acd6-36cbe08efcc1" />
<img width="1907" height="881" alt="image" src="https://github.com/user-attachments/assets/795d0d63-f171-40a2-ba8a-948c5ad69d45" />


[![CI](https://github.com/hiffang/ai-pos-system/actions/workflows/ci.yml/badge.svg)](https://github.com/hiffang/ai-pos-system/actions/workflows/ci.yml)
[![Release](https://github.com/hiffang/ai-pos-system/actions/workflows/release.yml/badge.svg)](https://github.com/hiffang/ai-pos-system/actions/workflows/release.yml)
![Node](https://img.shields.io/badge/node-22-brightgreen)
![Electron](https://img.shields.io/badge/electron-41-47848F)
![License](https://img.shields.io/badge/license-ISC-blue)

[Features](#features) · [Tech Stack](#tech-stack) · [Quick Start](#quick-start) · [Configuration](#configuration) · [Architecture](#architecture) · [CI/CD](#cicd)

</div>

---

## Overview

AI POS System is a Windows desktop application that turns any PC into a full-featured point-of-sale terminal. It works entirely offline — all sales, inventory, and payment data are stored in a local SQLite database and synced to the cloud automatically when an internet connection is available.

Built for Sri Lankan small grocery shops with LKR currency support, LankaQR payment integration, thermal receipt printing, and an AI-powered dashboard that forecasts demand and generates plain-language business insights.

---

## Features

<table>
<tr>
<td width="50%">

**Sales & Payments**
- Product search with barcode scanning support
- Cart with real-time stock validation
- Cash, card, wallet, LankaQR, bank transfer, and credit/tab payments
- LKR currency formatting (`toLocaleString('en-LK')`)
- Thermal receipt printing via ESC/POS

</td>
<td width="50%">

**Inventory**
- Real-time stock tracking and low-stock alerts
- Configurable reorder thresholds per product
- Category management
- Inventory change log for auditing

</td>
</tr>
<tr>
<td width="50%">

**AI & Analytics**
- Dashboard with 7-day and 4-week sales trends
- Demand forecast (heuristic engine with pluggable ONNX adapter)
- AI narrative summaries via Claude API (cached, cost-controlled)
- Payment method breakdown chart

</td>
<td width="50%">

**Operations**
- Role-based access: Cashier, Manager, Admin
- Offline-first with automatic Supabase cloud sync
- JWT authentication with auto-generated secrets
- Diagnostics screen for system health checks

</td>
</tr>
</table>

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Desktop shell** | Electron 41, electron-builder 26 (NSIS installer) |
| **Frontend** | React 19, Vite 8, Tailwind CSS 4, Zustand 5, Recharts 3 |
| **Backend** | Node.js 22, Express 5, Winston, Helmet, express-rate-limit |
| **Database** | Prisma 4 + SQLite (local), Supabase (optional cloud sync) |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **AI** | Claude API (narratives), pluggable adapter for local inference |
| **Printing** | node-thermal-printer (ESC/POS, USB/serial) |
| **CI/CD** | GitHub Actions — lint, test, build, publish NSIS installer |

---

## Quick Start

### Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [Git](https://git-scm.com/)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/hiffang/ai-pos-system.git
cd ai-pos-system

# 2. Install dependencies
npm install

# 3. Copy and fill in the environment file
cp .env.example .env

# 4. Set up the database
npm run db:generate   # generate Prisma client
npm run db:push       # create SQLite schema
npm run db:seed       # load default users, categories, and products

# 5. Start both servers with hot reload
npm run dev
```

The Vite dev server starts at **http://localhost:5173** and proxies all `/api` requests to the Express backend at **http://localhost:3000**.

Default credentials after seeding:

| Role | Email | Password |
|---|---|---|
| Admin | admin@shop.com | admin123 |
| Manager | manager@shop.com | manager123 |
| Cashier | cashier@shop.com | cashier123 |

---

## Configuration

Create a `.env` file in the project root. Required variables are validated on every server startup — the app will not start if they are missing.

<details>
<summary><strong>View all environment variables</strong></summary>

```env
# ── Required ────────────────────────────────────────────────────────────────

# Prisma SQLite connection (auto-set in packaged app; set manually for dev)
DATABASE_URL=file:./prisma/pos.db

# JWT signing secret — minimum 32 characters
# Auto-generated in the packaged app and stored in %APPDATA%\AI POS System\jwt-secret.txt
JWT_SECRET=your-random-32-byte-hex-string

# Server
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# ── Optional: Cloud Sync ─────────────────────────────────────────────────────
# If omitted, the outbox accumulates locally and the app works fully offline.

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# ── Optional: AI Narratives ───────────────────────────────────────────────────
# If omitted, the dashboard shows the last cached narrative (or nothing on first run).

ANTHROPIC_API_KEY=sk-ant-...
# How long to keep a cached narrative before regenerating (hours, default 12)
AI_INSIGHT_MAX_AGE_HOURS=12

# ── Optional: Payment Gateways ───────────────────────────────────────────────
# Gateway verification is a planned feature; these are not yet active.

PAYHERE_MERCHANT_ID=
PAYHERE_SECRET=
ONEPAY_APP_ID=
ONEPAY_APP_TOKEN=

# ── Optional: Debug ───────────────────────────────────────────────────────────

# Set to 1 to open Electron DevTools automatically
ELECTRON_DEBUG=1
```

</details>

In the **packaged Windows app**, `DATABASE_URL` and `JWT_SECRET` are set automatically — no `.env` file is required. User data lives in `%APPDATA%\AI POS System\`.

---

## Project Structure

<details>
<summary><strong>Expand directory tree</strong></summary>

```
ai-pos-system/
├── .github/
│   └── workflows/
│       ├── ci.yml          # Lint + test + Vite build on every push & PR
│       └── release.yml     # Build NSIS installer and publish on v*.*.* tags
│
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── POS/        # Terminal: ProductGrid, Cart, payment dialogs
│   │   │   ├── Dashboard/  # Analytics: SalesChart, DemandForecast, AIInsightStrip
│   │   │   └── Settings/   # Account, Users, Diagnostics panels
│   │   ├── pages/          # Login, Inventory, Settings, Help
│   │   ├── store/          # Zustand: authStore, apiClient
│   │   └── hooks/          # Custom React hooks
│   └── vite.config.js
│
├── server/                 # Express API (spawned as child process by Electron)
│   ├── index.js            # Startup, env validation, route mounting
│   ├── db.js               # Prisma singleton
│   ├── middleware/         # JWT auth, role guards, error handler
│   ├── routes/             # auth, products, categories, transactions,
│   │                       # payments, dashboard, ai, hardware, users
│   └── services/
│       ├── syncEngine.js   # localWrite() — atomic DB write + outbox entry
│       ├── syncDaemon.js   # Background outbox flush to Supabase
│       ├── paymentHandler.js
│       ├── aiInference.js  # Demand forecast facade (heuristic / ONNX adapter)
│       ├── ai/             # Claude API integration, model registry, adapters
│       └── hardware/       # Printer registry, ESC/POS adapter, receipt formatter
│
├── electron/
│   └── main.js             # Boot sequence, server spawn, window management
│
├── prisma/
│   ├── schema.prisma       # Data models (SQLite; enums stored as strings)
│   ├── migrations/         # SQL migration history
│   └── seed.js             # Default users, categories, products
│
├── scripts/
│   ├── beforeBuild.js      # electron-builder hook: prisma generate + seed DB
│   └── afterPack.js        # electron-builder hook: npm install --production
│
└── ai/
    └── models/             # Local inference models (active.json points to active)
```

</details>

---

## Architecture

### Boot Sequence (packaged app)

```
Electron main.js
  │
  ├── configureRuntimeEnv()
  │     ├── Parse .env (if present)
  │     ├── Set DATABASE_URL → %APPDATA%\AI POS System\data\pos.db
  │     └── Generate JWT_SECRET if missing, persist to jwt-secret.txt
  │
  ├── showSplash()              ← animated splash window shown immediately
  │
  ├── runMigrations()
  │     ├── prisma migrate deploy
  │     └── If DB has no migration history (created with db push):
  │           baseline all migrations → retry deploy
  │
  ├── startServer()
  │     └── spawn(node, server/index.js, { ELECTRON_RUN_AS_NODE: "1" })
  │
  ├── waitForServer()           ← polls GET /api/health every 300 ms
  │
  └── createMainWindow()        ← loads React SPA, closes splash
```

### Offline-First Write Pattern

Every database write goes through `localWrite()` in `server/services/syncEngine.js`:

```
POST /api/transactions
  │
  └── localWrite('Order', data)
        └── prisma.$transaction([
              prisma.order.create(data),      ← local write, always succeeds
              prisma.outbox.create(entry)     ← outbox entry created atomically
            ])

syncDaemon (background — probes every 20 s, flushes every 30 s when online)
  └── flush outbox entries → Supabase INSERT / UPDATE / DELETE
        └── mark entry as synced
```

Writes never block on network. If the device is offline, data is safe locally and syncs the next time connectivity returns.

### AI Cost Controls

The Claude API is called only when all three gates pass:

```
getInsight(forecastData)
  ├── Gate 1: hash(forecastData) === cached hash?  → return cache immediately
  ├── Gate 2: cache age < MAX_AGE_HOURS?           → return cache
  ├── Gate 3: ANTHROPIC_API_KEY set and online?    → return cache or null
  └── All gates open → call Claude API → store in AIInsight table
```

---

## Database Schema

<details>
<summary><strong>View Prisma models</strong></summary>

| Model | Key Fields |
|---|---|
| **User** | id, name, email, passwordHash, role (CASHIER\|MANAGER\|ADMIN) |
| **Category** | id, name |
| **Product** | id, categoryId, name, sku, barcode, priceLKR, stockQty, reorderThreshold |
| **Order** | id, userId, totalLKR, status (PENDING\|COMPLETED) |
| **OrderItem** | id, orderId, productId, quantity, unitPriceLKR |
| **Payment** | id, orderId, method, status, amountLKR, changeLKR, gatewayRef |
| **InventoryLog** | id, productId, qtyChange, reason, loggedAt |
| **Outbox** | id, entity, entityId, operation, payload (JSON string), synced |
| **AuditLog** | id, userId, action, metadata (JSON string) |
| **AIInsight** | id, narrative, inputHash, generatedAt, stale |

> **SQLite note:** Enums and JSON fields are stored as plain strings. Prisma's `mode: "insensitive"` filter is not supported — use `COLLATE NOCASE` in raw SQL for case-insensitive queries.

</details>

### Migration Commands

```bash
# Apply all pending migrations (production and CI)
npx prisma migrate deploy

# Push schema directly without a migration file (dev only — no history)
npm run db:push

# Open the visual database browser
npm run db:studio
```

---

## Building & Packaging

### Frontend only

```bash
npm run build
# Output → client/dist/
```

### Windows installer

```bash
npm run package
# Output → dist-electron/AI POS System Setup.exe
```

The `package` script runs two electron-builder hooks automatically:

| Hook | What it does |
|---|---|
| `scripts/beforeBuild.js` | Runs `prisma generate` then `prisma migrate deploy` to create a clean seed database with full migration history |
| `scripts/afterPack.js` | Runs `npm install --production` inside the staged app directory (electron-builder excludes `node_modules` by default in v26+) |

> **Why `asar: false`?** Node's `require()` cannot resolve modules from inside an `.asar` archive at runtime. With `asar: false`, `node_modules` sits next to `server/` in `resources/app/` — standard resolution just works.

---

## Available Scripts

```bash
npm run dev          # Start Vite + Express with hot reload
npm run build        # Build Vite frontend → client/dist/
npm run electron     # Launch Electron (run build first)
npm run package      # Full build + NSIS installer
npm run lint         # ESLint across all JS/JSX
npm run test         # Jest test suite
npm run format       # Prettier
npm run db:generate  # Regenerate Prisma client
npm run db:push      # Sync schema to SQLite (dev only)
npm run db:seed      # Insert default users, categories, products
npm run db:studio    # Open Prisma Studio
```

---

## CI/CD

### CI — every push and pull request to `main`

All three jobs run in parallel. A failing job cancels redundant runs for the same branch.

| Job | Runner | Steps |
|---|---|---|
| **lint** | ubuntu-latest | ESLint |
| **test** | ubuntu-latest | `prisma generate` + Jest |
| **build-client** | ubuntu-latest | Vite build → artifact upload |

### Release — on version tags

```bash
git tag v1.2.0
git push origin v1.2.0
```

The `release-windows` job builds on `windows-latest`, runs both electron-builder hooks, and publishes the `.exe` installer directly to the GitHub Release for that tag.

---

## Contributing

1. Fork the repo and create a feature branch from `main`
2. Run `npm install` and `npm run db:push` to get set up locally
3. Make your changes — see key conventions below
4. Run `npm run lint` and `npm test` before pushing
5. Open a pull request — CI runs automatically on every push

### Key conventions

- **Currency** — always format with `toLocaleString('en-LK')`
- **DB writes** — always use `localWrite()` in `server/services/syncEngine.js`; never call `prisma.*` directly in route handlers
- **Payment logic** — lives in `server/services/paymentHandler.js`; routes only call `processPayment()`
- **Error handling** — all route handlers use `try/catch` and `next(error)` to the central error handler

---

## License

ISC © [Hiffan Abdul Gaffoor](https://github.com/hiffang)
