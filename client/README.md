# Money & Mind by Mayden — Frontend

A subscription-based daily audio motivation platform for women, built as a Progressive Web App (PWA).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router DOM 7 |
| HTTP Client | Axios |
| Icons | Lucide React |
| Rich Text Editor | TipTap |
| PWA | vite-plugin-pwa + Workbox |

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` requests to `http://localhost:5000`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── main.jsx                  # Entry point
├── App.jsx                   # Routing + route guards
├── index.css                 # Tailwind theme + custom styles
│
├── assets/                   # Static images
├── constants/copy.js         # Landing page text content
├── context/AuthContext.jsx   # Auth state (login, register, logout)
├── services/api.js           # Axios instance with JWT interceptors
│
├── hooks/
│   ├── useAudio.js           # Audio player controls
│   ├── usePricing.js         # Fetch pricing from API
│   └── useSubscription.js    # Fetch/manage subscription
│
├── components/
│   ├── layout/
│   │   ├── AdminLayout.jsx       # Admin sidebar layout
│   │   └── SubscriberLayout.jsx  # Subscriber header + nav
│   └── ui/
│       ├── AudioPlayer.jsx       # Audio player with waveform
│       ├── Button.jsx            # Reusable button component
│       ├── Carousel.jsx          # Horizontal scroll carousel
│       ├── EpisodeCard.jsx       # Episode display card
│       ├── FaqAccordion.jsx      # FAQ accordion
│       ├── InstallBanner.jsx     # PWA install prompt
│       ├── LogoLockup.jsx        # Brand logo component
│       └── PricingCard.jsx       # Pricing display card
│
└── pages/
    ├── Landing.jsx           # Marketing landing page
    ├── Login.jsx             # User login
    ├── Register.jsx          # User registration
    ├── Dashboard.jsx         # Subscriber dashboard + today's episode
    ├── Library.jsx           # Searchable episode library
    ├── Subscription.jsx      # Plan selection + Paystack payment
    ├── Terms.jsx             # Terms & conditions
    ├── Privacy.jsx           # Privacy policy (NDPA compliant)
    ├── Support.jsx           # Contact support
    └── admin/
        ├── AdminLogin.jsx        # Admin login
        ├── AdminDashboard.jsx    # Stats + growth chart
        ├── Episodes.jsx          # Episode CRUD + calendar
        ├── Users.jsx             # User management
        ├── UserDetail.jsx        # Individual user profile
        ├── Subscriptions.jsx     # Payment history + CSV export
        ├── Notifications.jsx     # Notification composer
        └── Settings.jsx          # App configuration
```

## Features

### Public
- Marketing landing page with hero, how-it-works, pricing, FAQ
- Free audio sample player
- User registration and login

### Subscriber
- Daily 2-minute audio episodes themed by weekday:
  - **Motivation Monday** — Vision-setting and discipline
  - **Tactical Tuesday** — Money habits and micro-saving
  - **Wellness Wednesday** — Somatic breathing exercises
  - **Testimonial Thursday** — Real stories from other women
  - **Financial Friday** — Weekly resets and celebrating wins
- "The Vault" — mood-based episode search and browsing
- Subscription management with Paystack integration

### Admin
- Dashboard with revenue, subscriber metrics, and growth chart
- Episode management with weekly calendar, rich text editor, bulk actions
- User management with search, filters, and detailed profiles
- Payment history with CSV export and failed payment reminders
- Notification composer (in-app + email)
- Settings for pricing, scheduling, and day labels

### PWA
- Service worker with auto-update (Workbox)
- Install banner prompt
- Standalone display mode
- Safe-area-inset support for mobile

## API

The frontend communicates with a REST API at `/api/*` (proxied to `localhost:5000` in development). Authentication uses JWT tokens stored in localStorage.

Key API domains: `/auth`, `/episodes`, `/subscriptions`, `/payments`, `/notifications`, `/admin/*`, `/settings`.

## Brand

- **Primary color:** Mayden Magenta `#EC268F`
- **Dark color:** `#1A1A1A`
- **Fonts:** Inter (sans-serif), Playfair Display (serif)
