# Backend Setup Instructions

## Prerequisites

1. **Node.js** - v18+ installed
2. **PostgreSQL** - Running locally (or use DATABASE_URL pointing to a remote instance)
3. **Environment Variables** - `.env` file with DATABASE_URL, JWT_SECRET, etc.

## Initial Setup

Run these commands in order:

### 1. Install dependencies

```bash
npm install
```

> The project uses Prisma 4.15.0 LTS — stable and battle-tested for PostgreSQL.

### 2. Generate Prisma Client

```bash
npm run db:generate
```

**Important**: This must be run after any schema changes or on first setup. It generates the TypeScript types and client code from `prisma/schema.prisma`.

### 3. Push schema to database

```bash
npm run db:push
```

This creates/updates all tables in your PostgreSQL database.

### 4. Seed database (optional)

```bash
npm run db:seed
```

Populates the database with initial test data.

## Running the Application

### Development Mode

```bash
npm run dev
```

This starts:

- Vite dev server on `http://localhost:5173` (frontend)
- Node/Express server on `http://localhost:3000` (backend)
- Both with hot-reload on file changes

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Database Commands

- `npm run db:generate` - Regenerate Prisma client (after schema changes)
- `npm run db:push` - Sync schema to database
- `npm run db:seed` - Run seed script
- `npm run db:studio` - Open Prisma Studio GUI for data browsing

## Environment Variables

Required `.env` variables:

```
DATABASE_URL=postgresql://user:password@localhost:5432/pos_dev
JWT_SECRET=your-secret-key-here
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
```

Optional:

```
PAYHERE_MERCHANT_ID=...
PAYHERE_SECRET=...
ONEPAY_APP_ID=...
ONEPAY_APP_TOKEN=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

## Troubleshooting

### PrismaClientInitializationError

**Cause**: Prisma client hasn't been generated or DATABASE_URL is invalid

**Solution**:

```bash
npm run db:generate
# Verify DATABASE_URL is correct in .env
# Check PostgreSQL is running
```

### Database connection failed

**Cause**: PostgreSQL isn't running or DATABASE_URL is wrong

**Solution**:

```bash
# Check PostgreSQL is running
# Update DATABASE_URL in .env
npm run db:push  # Test connection
```

### Schema changes not applied

**Cause**: Prisma client wasn't regenerated after schema edit

**Solution**:

```bash
npm run db:generate
npm run db:push
```

## Backend API Endpoints

All endpoints are prefixed with `/api`:

- `GET /health` - Server health check
- `POST /payments` - Create payment
- `POST /payments/verify-payhereay` - Verify PayHere payment
- `GET /products` - List products (with search/pagination)
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `GET /transactions` - List transactions (with date filter)
- `POST /transactions` - Create transaction with items

## Project Structure

```
server/
├── index.js                    # Main Express app
├── db.js                       # Prisma client singleton
├── middleware/
│   └── errorHandler.js         # Centralized error handling
├── services/
│   ├── syncEngine.js           # Offline-first sync with outbox
│   ├── paymentHandler.js       # Payment processing
│   └── aiInference.js          # ONNX model inference
└── routes/
    ├── payments.js             # Payment endpoints
    ├── products.js             # Product management endpoints
    └── transactions.js         # Transaction endpoints

client/
├── src/
│   ├── App.jsx                 # React Router setup
│   ├── MainLayout.jsx          # Layout wrapper
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Inventory.jsx
│   │   ├── CustomerCredit.jsx
│   │   └── ...
│   ├── components/
│   └── store/
│       └── navigationStore.js   # Zustand state
└── ...

prisma/
├── schema.prisma               # Database schema
└── migrations/                 # Database migration history
```

## Key Architectural Patterns

### Offline-First Sync (localWrite)

All database writes go through `localWrite()` to ensure atomic DB + outbox entries:

```javascript
const { result, outboxEntry } = await localWrite("create", "Transaction", data);
```

### Centralized Error Handling

All routes wrap logic in try/catch and pass errors to the error middleware:

```javascript
app.use(errorHandler); // Must be last middleware
```

### Payment Processing

Routes call `processPayment()` which handles method validation and status management:

```javascript
const payment = await processPayment("cash", 1000, customerId, metadata);
```

### AI Inference

On-device ONNX model for demand forecasting:

```javascript
const forecast = await forecastDemand(productData);
```

See CLAUDE.md for full conventions and patterns.
