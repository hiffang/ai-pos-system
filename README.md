# AI POS System

Offline-first POS system for Sri Lankan small grocery shops. Includes a React + Vite frontend, Node.js + Express backend, Electron desktop wrapper, Prisma ORM with SQLite, and optional Supabase sync.

## Features

- Offline-first transactions with outbox sync
- LKR currency formatting
- Multiple payment methods: cash, card, wallet, QR, bank transfer, credit/tab
- AI inference via ONNX model
- Electron desktop packaging

## Tech Stack

- Frontend: React, Vite, Tailwind, Zustand
- Backend: Node.js, Express
- Desktop: Electron
- Database: Prisma + SQLite (local), Supabase (optional sync)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file at the project root (see the example below).

3. Generate Prisma client and sync the schema:

```bash
npm run db:generate
npm run db:push
```

4. (Optional) Seed the database:

```bash
npm run db:seed
```

5. Start the app in development mode:

```bash
npm run dev
```

This runs:

- Frontend dev server: http://localhost:5173
- Backend API: http://localhost:3000

## Environment Variables

Required:

```
DATABASE_URL="file:./prisma/pos.db"
JWT_SECRET=your-secret-key-here
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
```

Optional (payment gateways and cloud sync):

```
PAYHERE_MERCHANT_ID=...
PAYHERE_SECRET=...
ONEPAY_APP_ID=...
ONEPAY_APP_TOKEN=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

## Scripts

- `npm run dev` - Start frontend + backend with hot reload
- `npm run build` - Build the frontend
- `npm run electron` - Launch Electron (dev)
- `npm run package` - Build and package Electron app
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Run Prettier
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Sync schema to SQLite
- `npm run db:seed` - Seed the database
- `npm run db:studio` - Open Prisma Studio

## Project Structure

- [client/](client/) - React frontend
- [server/](server/) - Express API
- [electron/](electron/) - Electron main process
- [prisma/](prisma/) - Prisma schema, migrations, seed
- [ai/](ai/) - Model assets and helpers

## Notes

- Prisma uses SQLite; enums and JSON fields are stored as strings in SQLite.
- Database writes use an outbox pattern to support offline sync.
- AI inference runs via ONNX Runtime Node.
