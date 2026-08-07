# CTA Handoff — Mayden Website → Money & Mind Portal

This is the go-live handoff for adding a call-to-action on the **external Mayden
corporate website** that points visitors into the **Money & Mind portal**
(`client/` + `server/` in this repo). The corporate site lives outside this
repo, so the snippet below is designed to be pasted directly into it.

---

## 1. Pick the CTA target URL

The portal is a React SPA. Recommended deep-link targets:

| Destination      | URL                                  | Notes |
|------------------|--------------------------------------|-------|
| Sign-up (primary)| `https://<PORTAL_DOMAIN>/register`   | Directly opens registration |
| Landing page     | `https://<PORTAL_DOMAIN>/`           | Shows hero + pricing first, then CTA to sign up |

> Decide the target **before** going live. If you want a stable alias that
> never breaks if signup moves, add a `/get-started` redirect route in
> `client/src/App.jsx`:
>
> ```jsx
> <Route path="/get-started" element={<Navigate to="/register" replace />} />
> ```

## 2. Required server config

Edit `server/.env` (production values go in the deployment environment):

```env
# Absolute URL of the portal — used by Paystack redirect/callback AND by the
# Mayden-site CTA button below.
FRONTEND_URL="https://<PORTAL_DOMAIN>"

# Comma-separated origins allowed to call the portal API (CORS).
# If the Mayden corporate site is a different domain (e.g. https://www.mayden.com.ng),
# add it here so browser fetch/redirects from that site work.
CLIENT_ORIGINS="https://<PORTAL_DOMAIN>,https://www.mayden.com.ng"

# IMPORTANT — change this before production (must be ≥32 chars, non-placeholder).
JWT_SECRET="<long-random-secret>"
```

Notes:

- `FRONTEND_URL` is also the base for the Paystack `callback_url` and for the
  `GET /api/payments/callback` redirect, so it must match the deployed domain.
- The CORS allowlist is enforced by the server (`server/src/app.js`). A simple
  link (non-browser navigation) does **not** need CORS; CORS only matters if the
  Mayden site makes `fetch()` calls to the portal API. Include the Mayden
  origin in `CLIENT_ORIGINS` anyway so embedded widgets behave.

## 3. Button snippet — paste into the Mayden website

Drop this wherever the Mayden site's hero/section lives. It is self-contained:
no dependencies, uses the site's existing Tailwind variables if present, and
falls back to plain CSS otherwise.

```html
<!-- Money & Mind CTA — paste into the Mayden website -->
<a
  href="https://<PORTAL_DOMAIN>/register"
  target="_blank"
  rel="noopener noreferrer"
  class="mnm-cta"
>
  Start Money &amp; Mind
  <span class="mnm-cta-price">₦100 / week</span>
</a>

<style>
  .mnm-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.9rem 1.6rem;
    border-radius: 999px;
    background: #e2147c;            /* Mayden magenta */
    color: #fff !important;
    font-weight: 600;
    text-decoration: none;
    box-shadow: 0 10px 24px rgba(226, 20, 124, 0.35);
    transition: background 0.2s ease, transform 0.2s ease;
  }
  .mnm-cta:hover { background: #c2116d; transform: translateY(-1px); }
  .mnm-cta-price { font-weight: 400; opacity: 0.85; font-size: 0.9em; }
</style>
```

If the Mayden site uses React/Vue, replace the `<a>` with the framework's
router link component (same `href`) so SPA navigation works in-app.

## 4. Pre-flight checklist

- [ ] `FRONTEND_URL` set to the deployed portal domain in production env.
- [ ] `CLIENT_ORIGINS` includes the Mayden website origin.
- [ ] `JWT_SECRET` rotated to a ≥32-char random value.
- [ ] Portal deploy tested at `https://<PORTAL_DOMAIN>/register`.
- [ ] Paystack keys configured in production (`PAYSTACK_SECRET_KEY`,
      `PAYSTACK_PUBLIC_KEY`) — the dev-mode bypass is disabled in production.
- [ ] Paystack **webhook** set to `https://<RENDER_HOST>/api/payments/webhook` with
      these events enabled: `charge.success`, `charge.failed`, `subscription.create`,
      `invoice.update`, `subscription.disable`, `subscription.not_renew`. The server
      auto-creates the Weekly/Monthly Plans — no Paystack dashboard plan setup needed.
- [ ] Click the CTA from the live Mayden site and complete a test signup →
      Paystack checkout → active subscription → audio playback.

## 5. Verification against this repo

- Server security regression suite: `cd server && npm test` (35 tests).
- Client production build: `cd client && npm run build`.
