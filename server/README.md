# Money & Mind — Backend

REST API server for the Money & Mind subscription audio platform. Handles authentication, episode management, Paystack payments, subscriptions, and admin operations.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express 5 |
| Database | PostgreSQL via Prisma ORM 6 |
| Authentication | JWT + bcryptjs |
| Payments | Paystack |
| File Uploads | Multer (50MB max, audio only) |
| Security | Helmet, CORS |
| Logging | Morgan |

## Getting Started

```bash
npm install
cp .env.example .env        # configure secrets (add your PostgreSQL DATABASE_URL)
npx prisma migrate dev      # create tables in the database
npm run seed                 # create admin user
npm run dev                  # start with nodemon
```

Server runs on `http://localhost:5000`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with nodemon |
| `npm start` | Start production server |
| `npm run seed` | Create or rotate the admin user from env vars (upsert) |
| `npm test` | Run the test suite (against a dedicated `test` schema in your PostgreSQL database) |

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. from Render) |
| `JWT_SECRET` | Secret key for JWT signing (must be a strong, unique value in production) |
| `PORT` | Server port (default `5000`) |
| `PAYSTACK_SECRET_KEY` | Paystack API secret key (live or test) |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key (must match secret key's mode) |
| `FRONTEND_URL` | Frontend base URL for payment redirects/callbacks (default `http://localhost:5173`); a trailing slash is tolerated and stripped |
| `CLIENT_ORIGINS` | Comma-separated CORS allowlist of browser origins (default `http://localhost:5173`; merged with the hardcoded `https://mayden-money-mind.vercel.app` production origin) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credentials for the admin user — `npm run seed` upserts them |
| `BREVO_API_KEY` | Brevo transactional API key for the reconciliation emails and password-reset emails (Brevo: SMTP & API → API Keys) |
| `BREVO_FROM_EMAIL` | Verified sender address in Brevo for all outgoing mail (reports + reset links) |
| `RECONCILIATION_EMAIL` | Recipient of the daily/monthly payment CSV reports |
| `RECONCILIATION_HOUR` | Hour (UTC) the daily report runs — default `23` (23:00 UTC = midnight Lagos), reports the previous calendar day |
| `MONTHLY_REPORT_HOUR` | Hour (UTC) the monthly report runs — default `23` |
| `MONTHLY_REPORT_DAY` | Day-of-month the monthly report runs — default `1` (reports the previous calendar month) |

## Production Deployment

The app ships as two services:

- **API → Render** (free web service, `server/`): set `DATABASE_URL` (External URL from the Render Postgres dashboard), `JWT_SECRET`, `PAYSTACK_*`, `FRONTEND_URL=https://mayden-money-mind.vercel.app`, `CLIENT_ORIGINS=https://mayden-money-mind.vercel.app`. After first deploy run `npm run seed` locally against the same `DATABASE_URL`.
- **Client → Vercel** (`client/`): `client/vercel.json` rewrites `/api/(.*)` → the Render API and adds an SPA fallback to `/index.html` (required for the Paystack return redirect to reach client-side routing).

Paystack dashboard: set the webhook to `https://<render-host>/api/payments/webhook` and the callback to the Vercel app URL.

## Admin User

`npm run seed` **upserts** the admin by email — it updates the password hash + role if the user already exists. To rotate the admin password: edit `ADMIN_PASSWORD` in `.env`, then run `npm run seed`. It reads `.env` automatically.

## Project Structure

```
src/
├── server.js                 # Entry point (env check, DB connect, startup)
├── app.js                    # Express setup, middleware, route mounting
│
├── config/
│   ├── env.js                # Central env vars + config guard
│   ├── prisma.js             # Shared PrismaClient singleton
│   └── paystack.js           # Paystack API base URL + key lookup
│
├── middleware/
│   ├── auth.js               # JWT verification
│   └── admin.js              # Admin role check
│
├── controllers/
│   ├── authController.js     # Register, login, password reset
│   ├── episodeController.js  # Public episode endpoints
│   ├── subscriptionController.js  # User subscription CRUD
│   ├── paymentController.js  # Paystack payment flow
│   ├── adminController.js    # Admin-only endpoints
│   └── audioController.js    # Signed audio streaming
│
├── routes/                   # Thin route definitions → controllers
│   ├── auth.js
│   ├── episodes.js
│   ├── subscriptions.js
│   ├── payments.js
│   ├── admin.js
│   └── audio.js
│
├── services/
│   ├── paymentService.js     # Paystack API integration
│   ├── renewalService.js     # Grace period processor (every 12h)
│   ├── autoPublishService.js # Auto-publish scheduler (every 15min)
│   ├── dailyReminderService.js # Daily "time to listen" in-app reminder (every 15min)
│   ├── reconciliationService.js # Daily (midnight) + monthly (1st) payment CSV → finance email
│   ├── emailService.js       # Shared Brevo transactional email sender
│   └── audioStorageService.js# Multer config for audio uploads
│
└── utils/
    ├── helpers.js            # Reference generation, date helpers
    └── audioAccessControl.js # Signed-URL signing/verification

tests/
├── helpers.js                # Test bootstrap (env, DB reset, factories)
├── auth.test.js              # Auth + rate limiting + password reset
├── admin.test.js             # Admin access control
├── subscriptions.test.js     # Subscription lifecycle enforcement
├── payments.test.js          # Payment flow + webhook signatures
├── episodes.test.js          # Episode visibility
├── audio.test.js             # Audio access control
├── reminders.test.js         # Daily listen reminder
└── app.test.js               # Notifications + CORS

prisma/
├── schema.prisma             # Database schema (8 models)
├── seed.js                   # Admin user seeder
└── migrations/               # Migration history
```

## Database Models

| Model | Purpose |
|---|---|
| **User** | Users with email/phone, password hash, role (user/admin), password-reset token fields |
| **Subscription** | Plans (weekly/monthly) with status lifecycle + Paystack recurring codes (`paystackSubscriptionCode`, `paystackPlanCode`)
| **Payment** | Paystack payment records with references |
| **Episode** | Audio episodes with day type, show notes, publish date |
| **ListenLog** | Tracks which episodes users have listened to |
| **Notification** | In-app notifications with channel info + `subscribersOnly` flag |
| **NotificationRead** | Per-user read tracking for notifications |
| **Setting** | Key-value app configuration (pricing, scheduling, labels) |

## API Routes

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account, returns JWT |
| POST | `/api/auth/login` | No | Login, returns JWT |
| POST | `/api/auth/forgot-password` | No | Email a one-time password-reset link (no account enumeration) |
| POST | `/api/auth/reset-password` | No | Set a new password with a valid reset token |

### Episodes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/episodes` | No | List published episodes |
| GET | `/api/episodes/today` | No | Today's episode |
| GET | `/api/episodes/:id` | No | Single episode |
| GET | `/api/episodes/library` | Yes | User's listened episodes |
| POST | `/api/episodes/:id/listen` | Yes | Log listen event |

### Subscriptions

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/subscriptions/mine` | Yes | Current user's subscription |
| GET | `/api/subscriptions/mine/status` | Yes | Lightweight status check |
| POST | `/api/subscriptions` | Yes | Create new subscription |
| PATCH | `/api/subscriptions/:id` | Yes | Pause / resume / cancel |
| PATCH | `/api/subscriptions/:id/auto-renew` | Yes | Toggle automatic card renewal |

### Payments

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/payments/initialize` | Yes | Start Paystack transaction |
| POST | `/api/payments/verify` | Yes | Verify payment by reference |
| GET | `/api/payments/callback` | No | Paystack redirect callback |
| POST | `/api/payments/webhook` | No | Paystack webhook |

### Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications/latest` | Yes | User's notifications (last 20) |
| POST | `/api/notifications/:id/read` | Yes | Mark notification as read |

### Admin (`/api/admin`) — all require admin role

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/stats` | Dashboard metrics + growth chart |
| GET | `/api/admin/settings` | Get all settings |
| PUT | `/api/admin/settings` | Update settings |
| GET | `/api/admin/users` | List users (search + filter) |
| GET | `/api/admin/users/:id` | User detail |
| DELETE | `/api/admin/users/:id` | Delete user |
| POST | `/api/admin/users/:id/override` | Force cancel subscription |
| GET | `/api/admin/episodes` | List all episodes |
| POST | `/api/admin/episodes` | Create episode (with audio upload) |
| PUT | `/api/admin/episodes/:id` | Update episode |
| POST | `/api/admin/episodes/:id/publish` | Publish episode |
| DELETE | `/api/admin/episodes/:id` | Delete episode |
| GET | `/api/admin/subscriptions` | List all subscriptions |
| GET | `/api/admin/subscriptions/revenue` | Payment history |
| POST | `/api/admin/subscriptions/send-reminder` | Send payment reminders |
| GET | `/api/admin/notifications` | List notifications |
| POST | `/api/admin/notifications` | Create notification |
| POST | `/api/admin/notifications/test` | Preview notification |
| DELETE | `/api/admin/notifications/:id` | Delete notification |
| DELETE | `/api/admin/notifications` | Clear all notifications |
| GET | `/api/admin/audio-files` | Browse uploaded audio files |
| GET | `/api/admin/reports/utm` | UTM attribution funnel (registered → paid → active by source) |
| GET | `/api/admin/payments/export?days=1` | CSV of successful payments (or `?from=ISO&to=ISO`) |

### Utility

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Health check |
| GET | `/api/settings/pricing` | No | Public pricing info |

## Background Services

### Renewal Processor
- Runs every **12 hours**
- Expires `active` subscriptions whose renewal date passed with `autoRenew: false` (no further charge attempted)
- Handles `past_due` subscriptions with a configurable grace period (default 48h)
- Sends reminder notifications at 12h and 24h
- Auto-cancels when grace period expires

### Auto-Publisher
- Runs every **15 minutes**
- Publishes episodes when their `publishDate` + configured release time (default 6:00 AM) has passed
- Does **not** send notifications — subscribers get the daily reminder instead (below)

### Daily Listen Reminder
- Runs every **15 minutes**, fires **once per day** (idempotent via the `lastDailyReminderDate` setting) at the same release time as the auto-publisher (default 6:00 AM)
- Creates a single `subscribersOnly` in-app notification for active subscribers ("Time to Listen"), naming today's episode when one is published
- Non-subscribers never see these — `GET /api/notifications/latest` filters them out

### Password Reset Emails
- `POST /api/auth/forgot-password` emails a one-time link via Brevo (needs `BREVO_API_KEY` + `BREVO_FROM_EMAIL`). Without Brevo keys the server logs the link instead and still returns success — so local dev works without setup.

## Subscription Lifecycle

```
pending → active → past_due → cancelled
                ↘ paused → active (resume)
```

## Payment Flow

1. User creates a subscription
2. Server ensures the Paystack Weekly/Monthly **Plans** exist (auto-created once, plan codes cached in the `Setting` table)
3. Server initializes a Paystack transaction with `plan` + `invoice_limit: 0` — Paystack saves the card and enables **recurring billing** (auto-charges the card every 7/30 days)
4. User is redirected to Paystack checkout
5. On success, callback/webhook activates the subscription and stores the Paystack `subscription_code`
6. Each renewal fires `invoice.update` / `charge.success` (extend access) or `invoice.update` failed / `charge.failed` (→ `past_due` grace period)
7. Turning **auto-renew off** calls `DELETE /subscription/{code}` — future charges stop but access continues until the current period ends
8. Dev mode bypasses Paystack when no API key is configured

Paystack dashboard: set the webhook to `https://<render-host>/api/payments/webhook` and the callback to the Vercel app URL. No Paystack dashboard plan/subscription setup is required — plans are created by the server on first use.
