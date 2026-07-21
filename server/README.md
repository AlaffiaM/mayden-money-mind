# Money & Mind — Backend

REST API server for the Money & Mind subscription audio platform. Handles authentication, episode management, Paystack payments, subscriptions, and admin operations.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express 5 |
| Database | SQLite via Prisma ORM 6 |
| Authentication | JWT + bcryptjs |
| Payments | Paystack |
| File Uploads | Multer (50MB max, audio only) |
| Security | Helmet, CORS |
| Logging | Morgan |

## Getting Started

```bash
npm install
cp .env.example .env        # configure secrets
npx prisma migrate dev      # run migrations
npm run seed                 # create admin user
npm run dev                  # start with nodemon
```

Server runs on `http://localhost:5000`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with nodemon |
| `npm start` | Start production server |
| `npm run seed` | Create initial admin user from env vars |

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite connection string (default `file:./dev.db`) |
| `JWT_SECRET` | Secret key for JWT signing |
| `PORT` | Server port (default `5000`) |
| `PAYSTACK_SECRET_KEY` | Paystack API secret key |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `BASE_URL` | Frontend URL for redirects (default `http://localhost:5173`) |

## Project Structure

```
src/
├── server.js                 # Entry point
├── app.js                    # Express setup, middleware, route mounting
│
├── middleware/
│   ├── auth.js               # JWT verification
│   └── admin.js              # Admin role check
│
├── routes/
│   ├── auth.js               # Register + login
│   ├── episodes.js           # Public episode endpoints
│   ├── subscriptions.js      # User subscription CRUD
│   ├── payments.js           # Paystack payment flow
│   └── admin.js              # Admin-only endpoints
│
├── services/
│   ├── payment.js            # Paystack API integration
│   ├── renewal.js            # Grace period processor (every 12h)
│   ├── autoPublish.js        # Auto-publish scheduler (every 15min)
│   └── audioStorage.js       # Multer config for audio uploads
│
└── utils/
    └── helpers.js            # Reference generation, date helpers

prisma/
├── schema.prisma             # Database schema (7 models)
├── seed.js                   # Admin user seeder
└── migrations/               # Migration history
```

## Database Models

| Model | Purpose |
|---|---|
| **User** | Users with email/phone, password hash, role (user/admin) |
| **Subscription** | Plans (weekly/monthly) with status lifecycle |
| **Payment** | Paystack payment records with references |
| **Episode** | Audio episodes with day type, show notes, publish date |
| **ListenLog** | Tracks which episodes users have listened to |
| **Notification** | In-app notifications with channel info |
| **NotificationRead** | Per-user read tracking for notifications |
| **Setting** | Key-value app configuration (pricing, scheduling, labels) |

## API Routes

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account, returns JWT |
| POST | `/api/auth/login` | No | Login, returns JWT |

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
| POST | `/api/admin/episodes/:id/publish` | Publish + notify subscribers |
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

### Utility

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Health check |
| GET | `/api/settings/pricing` | No | Public pricing info |

## Background Services

### Renewal Processor
- Runs every **12 hours**
- Handles `past_due` subscriptions with a configurable grace period (default 48h)
- Sends reminder notifications at 12h and 24h
- Auto-cancels when grace period expires

### Auto-Publisher
- Runs every **15 minutes**
- Publishes episodes when their `publishDate` + configured release time (default 6:00 AM) has passed
- Sends in-app notifications to all active subscribers

## Subscription Lifecycle

```
pending → active → past_due → cancelled
                ↘ paused → active (resume)
```

## Payment Flow

1. User creates a subscription
2. Server initializes a Paystack transaction
3. User is redirected to Paystack checkout
4. On success, callback/webhook activates the subscription
5. Dev mode bypasses Paystack when no API key is configured
