# SEMMAI

A full-stack editorial fashion buy/sell marketplace.

**Stack:** React 18 + Vite + TypeScript + Tailwind CSS + React Router v6 + Redux Toolkit · Node.js + Express + TypeScript · PostgreSQL + Prisma · JWT (httpOnly cookies) · Multer + Cloudinary · Stripe · Docker Compose (Postgres + Redis)

```
/SEMMAI
  /client    → React frontend (Vite, port 5173)
  /server    → Express API (port 5000)
  docker-compose.yml
  .env.example
```

## Quick start

### 1. Start the databases

```bash
docker compose up -d
```

Postgres is exposed on host port **5433** (to avoid clashing with a locally installed PostgreSQL on 5432) and Redis on 6379. Already running your own PostgreSQL? Skip Docker and point `DATABASE_URL` in `server/.env` at it instead, e.g. `postgresql://postgres:<password>@localhost:5432/semmai`.

### 2. Configure environment

```bash
# Copy the relevant sections of .env.example:
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Fill in your Cloudinary keys (console.cloudinary.com) and Stripe test keys (dashboard.stripe.com/apikeys). The app runs without them, but image upload and checkout payment need real keys.

### 3. Set up the API

```bash
cd server
npm install
npx prisma db push        # create tables
npm run seed              # realistic demo data
npm run dev               # http://localhost:5000
```

### 4. Start the frontend

```bash
cd client
npm install
npm run dev               # http://localhost:5173
```

### 5. (Optional) Stripe webhooks locally

```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
# put the printed whsec_... into server/.env as STRIPE_WEBHOOK_SECRET
```

Checkout also works without webhook forwarding — the client confirms the payment via `POST /api/orders/:id/confirm`, which verifies the PaymentIntent with Stripe server-side.

## Demo accounts (password: `Password123!`)

| Email | Role |
|---|---|
| admin@shoppyfy.com | Admin |
| maison@shoppyfy.com | Seller |
| atelier@shoppyfy.com | Seller |
| julianna@shoppyfy.com | Buyer (seeded cart, wishlist, delivered order) |

Use Stripe test card `4242 4242 4242 4242` with any future expiry/CVC.

## API overview

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/register · login · refresh · logout · forgot-password · reset-password`, `GET /api/auth/me` |
| Products | `GET /api/products` (search/filter/sort/paginate), `GET /api/products/:idOrSlug`, `POST /api/products/:id/reviews` |
| Categories | `GET /api/categories` |
| Cart | `GET/DELETE /api/cart`, `POST /api/cart/items`, `PATCH/DELETE /api/cart/items/:id` |
| Wishlist | `GET /api/wishlist`, `POST/DELETE /api/wishlist/:productId` |
| Checkout | `POST /api/checkout/create-payment-intent`, `POST /api/webhooks/stripe` |
| Orders | `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/confirm · cancel` |
| Users | `PATCH /api/users/profile · password`, `POST /api/users/avatar`, addresses CRUD under `/api/users/addresses` |
| Admin | `GET /api/admin/stats · users · orders · products`, `PATCH /api/admin/users/:id/role`, `PATCH /api/admin/orders/:id`; catalog authoring: `POST/PATCH/DELETE /api/admin/products` (multipart image upload) and `POST/PATCH/DELETE /api/admin/categories` |

Auth uses short-lived access tokens + rotating refresh tokens, both in httpOnly cookies. The axios client (`client/src/api/axios.ts`) auto-refreshes on 401 and retries. Roles: `BUYER`, `SELLER`, `ADMIN` (admin passes every gate).

## Deploying free: Vercel + Supabase

### 1. Supabase (database)

1. Create a project at supabase.com → **Project Settings → Database → Connection string**.
2. Copy both URLs (replace `[YOUR-PASSWORD]`):
   - **Transaction pooler** (port `6543`) → this is `DATABASE_URL`, append `?pgbouncer=true`
   - **Direct connection** (port `5432`) → this is `DIRECT_URL`
3. Push the schema and seed from your machine:

```bash
cd server
# temporarily point server/.env at Supabase:
# DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
# DIRECT_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
npx prisma db push
npm run seed
```

### 2. Vercel (API)

1. Push this repo to GitHub, then in Vercel: **Add New Project → import the repo**.
2. Set **Root Directory = `server`** (framework preset: Other). `server/vercel.json` routes every request to the Express app exported from `server/api/index.ts`; `postinstall` runs `prisma generate`.
3. Environment variables:
   - `DATABASE_URL` (pooled, `?pgbouncer=true`) and `DIRECT_URL` (direct)
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (long random strings)
   - `CLIENT_URL` (your client URL from step 3 — set a placeholder now, update after)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
4. Deploy → note the URL, e.g. `https://shoppyfy-api.vercel.app`. Verify `https://shoppyfy-api.vercel.app/api/health`.

### 3. Vercel (client)

1. **Add New Project** from the same repo, **Root Directory = `client`** (framework preset: Vite).
2. Environment variables:
   - `VITE_API_URL=https://shoppyfy-api.vercel.app/api`
   - `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…`
3. Deploy → e.g. `https://shoppyfy.vercel.app`, then set that as `CLIENT_URL` on the API project and redeploy the API (needed for CORS + cookies).

### 4. Stripe webhook (production)

Stripe Dashboard → **Developers → Webhooks → Add endpoint**: `https://shoppyfy-api.vercel.app/api/webhooks/stripe`, event `payment_intent.succeeded` (and `payment_intent.payment_failed`). Copy the signing secret into the API project's `STRIPE_WEBHOOK_SECRET` and redeploy. (Checkout works even without this — the client falls back to server-side payment verification.)

Notes: auth cookies are `SameSite=None; Secure` in production since client and API are on different domains. Supabase free tier pauses the database after ~1 week of inactivity — just resume it from the dashboard. Redis isn't used in production (local dev convenience only).

## Pages

Home · Shop (filters/sort/pagination) · Product Detail (gallery, reviews, related) · Search · Sign In · Create Account · Reset Password · Cart · Checkout (Stripe Payment Element) · Order Confirmed · My Orders · Order Tracking · Wishlist · Profile (info, addresses, security) · Seller Dashboard · Admin Dashboard
