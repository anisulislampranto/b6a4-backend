# MediStore Backend (B6A4-backend)

Express + Prisma + PostgreSQL backend for MediStore (OTC medicine e-commerce).

## Tech Stack

- Node.js + Express (REST API)
- PostgreSQL + Prisma (DB + ORM)
- Better Auth (session auth)
- Socket.IO (real-time notifications)

## Features

- Auth with role-based access (`CUSTOMER`, `SELLER`, `ADMIN`)
- Medicines CRUD (seller/admin ownership rules)
- Orders + seller/admin status updates with valid status transitions
- Reviews (customer, delivered-only, one-review-per-medicine-per-user)
- Admin management: users, categories, brands, orders
- Real-time notifications (order placed, status updated)
- Dashboard stats endpoints for customer/seller/admin

## Requirements

- Node.js 18+ (recommended 20+)
- PostgreSQL database (local or hosted)

## Environment Variables

Create `B6A4-backend/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require
PORT=5000

BETTER_AUTH_SECRET=your-long-secret
BETTER_AUTH_URL=http://localhost:5000

# Allowed frontend origin (CORS)
APP_URL=http://localhost:3000

# Optional: NODE_ENV=development
```

Notes:
- `BETTER_AUTH_URL` must match your backend base URL.
- Do not commit real secrets to git.

## Install

```bash
cd B6A4-backend
npm install
```

## Database Setup (Prisma)

Generate Prisma Client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

## Scripts

```bash
npm run dev        # start dev server (tsx watch)
npm run build      # prisma generate + tsc --noEmit
npm run typecheck  # tsc --noEmit
npm run seed:admin # seed admin user
```

## Seeded Admin

Seed script: `src/script/seedAdmin.ts`

- Email: `admin@skillbridge.com`
- Password: `admin123`
- Role: `ADMIN`

If the user already exists, seeding will fail.

## API Routes (Implemented)

Auth:
- Better Auth: `GET/POST /api/auth/*`

Medicines:
- `GET /api/medicines` (public, filters)
- `GET /api/medicines/:id` (public)
- `POST /api/medicines` (SELLER, ADMIN)
- `GET /api/medicines/my` (SELLER, ADMIN)
- `PATCH /api/medicines/:id` (SELLER, ADMIN)
- `DELETE /api/medicines/:id` (SELLER, ADMIN)

Orders:
- `POST /api/orders` (CUSTOMER, SELLER, ADMIN)
- `GET /api/orders/my` (authenticated)
- `GET /api/orders/seller` (SELLER, ADMIN)
- `GET /api/orders/all` (ADMIN)
- `GET /api/orders/:id` (role-scoped)
- `PATCH /api/orders/seller/:id` (SELLER, ADMIN)
- `PATCH /api/orders/:id` (ADMIN)

Reviews:
- `GET /api/reviews/medicine/:medicineId` (public)
- `POST /api/reviews` (CUSTOMER, delivered-only rule)

Users:
- `GET /api/users` (ADMIN)
- `GET /api/users/me` (authenticated)
- `PATCH /api/users/me` (authenticated)
- `PATCH /api/users/:id` (ADMIN)

Categories:
- `GET /api/category` (public)
- `POST /api/category` (ADMIN)
- `DELETE /api/category/:id` (ADMIN)

Brands:
- `GET /api/brands` (public)
- `POST /api/brands` (ADMIN)
- `DELETE /api/brands/:id` (ADMIN)

Dashboard:
- `GET /api/dashboard/customer` (CUSTOMER)
- `GET /api/dashboard/seller` (SELLER)
- `GET /api/dashboard/admin` (ADMIN)
- Supports query: `range=7d|30d|90d|custom` and `startDate`/`endDate`

Notifications:
- `GET /api/notifications/my` (authenticated)
- `PATCH /api/notifications/:id/read` (authenticated)
- `PATCH /api/notifications/read-all` (authenticated)

## Real-time Notifications (Socket.IO)

Events:
- `notification:new` (emitted to `user:<userId>` room)
- `notification:read-all`

Current emission rules:
- Order placed -> notify sellers whose medicines are in the order
- Order status updated (seller/admin) -> notify the customer

## Local Run

```bash
cd B6A4-backend
npm run dev
```

Backend runs at `http://localhost:5000`.

## Deployment Note (Important)

Socket.IO requires a long-lived server.
- Do not deploy this backend as a Vercel Serverless Function if you need websockets.
- Use a persistent host (Render/Railway/Fly/etc) for realtime, or replace Socket.IO with a managed realtime provider.
