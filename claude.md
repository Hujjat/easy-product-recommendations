# Easy Product Recommendations - Shopify App

## Overview

A Shopify embedded app that displays product recommendations on PDP (product detail pages) and checkout. Merchants can view analytics, manage custom recommendations, and choose billing plans from the admin panel. Data is stored in Shopify metaobjects, events are tracked via app proxy, and billing uses Shopify's native billing API.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Polaris web components (s-* tags) |
| Routing | React Router 7 (file-based flat routes) |
| Backend | Node.js via React Router server |
| Build | Vite 6 |
| Database | Prisma ORM + SQLite (sessions + shop billing) |
| API | Shopify Admin GraphQL API (2026-04) |
| Auth | @shopify/shopify-app-react-router (OAuth) |
| Billing | Shopify App Billing API (3-tier) |
| Data Storage | Shopify Metaobjects (recommendations + analytics) |
| Tracking | App Proxy (storefront → app server) |

## App Architecture

### Pages (4 authenticated routes under `/app`)

1. **Home Dashboard** (`app/routes/app._index.jsx`)
   - Analytics widgets: plan info, usage, impressions, clicks, add-to-carts
   - Conversion rates (click rate, cart rate)
   - Top recommended products table
   - Quick start links

2. **Recommendations** (`app/routes/app.recommendations.jsx`)
   - List all custom recommendations with search and pagination
   - CRUD: create, edit, toggle, delete recommendations
   - Uses App Bridge `resourcePicker` for product selection
   - Custom recommendations override Shopify's default algorithm

3. **Pricing** (`app/routes/app.pricing.jsx`)
   - 3 plan cards: Free ($0), Standard ($29), Enterprise ($59)
   - Current plan badge, upgrade/downgrade buttons
   - Usage progress bar

4. **How to Use** (`app/routes/app.how-to-use.jsx`)
   - Step-by-step setup instructions
   - Links to theme editor, checkout editor, and app pages

### Extensions

1. **Theme App Extension - PDP Block** (`extensions/product-recommendations/`)
   - Liquid block with configurable settings (layout, colors, show/hide elements)
   - JS fetches recommendations via app proxy, falls back to Shopify Recommendations API
   - Tracks impressions, clicks, and add-to-cart events
   - Layouts: grid, slider, list

2. **Checkout UI Extension** (`extensions/checkout-recommendations/`)
   - Preact + Polaris web components (s-* tags)
   - Cart-based: recommends products related to cart items
   - Uses `shopify.query()` for Storefront API access
   - Uses `shopify.applyCartLinesChange()` for add-to-cart

### App Proxy

- Route: `app/routes/proxy.recommendations.jsx`
- Storefront URL: `https://{shop}.myshopify.com/apps/easy-recs`
- GET: Returns custom recommendations for a product (or empty for Shopify fallback)
- POST: Tracks analytics events (impression, click, add_to_cart)
- Enforces plan usage limits

### Data Models

**Prisma (Local SQLite):**
- `Session` - Shopify auth sessions
- `Shop` - Plan info and usage tracking (id, plan, recommendationsUsed, billingCycleStart)

**Metaobjects (Shopify):**
- `$app:recommendation` - Custom product recommendations (source_product, recommended_products, priority, is_active)
- `$app:recommendation_analytics` - Aggregated event tracking (source_product_id, recommended_product_id, event_type, event_date, count, shop_domain)

### Billing Plans

| Plan | Price | Limit |
|------|-------|-------|
| Free | $0/month | 100 recommendations |
| Standard | $29/month | 1,000 recommendations |
| Enterprise | $59/month | Unlimited |

## File Structure

```
app/
  routes/
    app.jsx                      # Layout + navigation
    app._index.jsx               # Home dashboard
    app.recommendations.jsx      # Recommendations CRUD
    app.pricing.jsx              # Pricing plans
    app.how-to-use.jsx           # How to use guide
    proxy.recommendations.jsx    # App proxy (recs + tracking)
    auth.$/route.jsx             # Auth catch-all
    auth.login/route.jsx         # Login page
    webhooks.app.uninstalled.jsx # Uninstall webhook
    webhooks.app.scopes_update.jsx # Scope update webhook
  utils/
    billing.server.js            # Plan checking, usage limits
    metaobjects.server.js        # Metaobject CRUD helpers
  shopify.server.js              # Shopify app config + billing
  db.server.js                   # Prisma client
  root.jsx                       # HTML root
  entry.server.jsx               # SSR entry
  routes.js                      # Route config

extensions/
  product-recommendations/       # Theme app extension (PDP)
    blocks/recommendations.liquid
    assets/recommendations.js
    assets/recommendations.css
    locales/en.default.json
    shopify.extension.toml
  checkout-recommendations/      # Checkout UI extension
    src/Checkout.jsx
    locales/en.default.json
    shopify.extension.toml
    package.json

prisma/
  schema.prisma                  # Session + Shop models

shopify.app.toml                 # App config, scopes, proxy, metaobjects
```

## Key Patterns

- **Authentication**: `authenticate.admin(request)` for admin routes, `authenticate.public.appProxy(request)` for proxy
- **Billing**: `billing.check()` to determine plan, `billing.request()` to subscribe
- **Metaobjects**: Use `metaobjectUpsert` with handle for idempotent creates, `metaobjectUpdate` for updates
- **Analytics aggregation**: One metaobject entry per (source, recommended, event_type, date) tuple, count incremented
- **Route pattern**: Loader for data fetching, Action for mutations, Polaris web components for UI

## Commands

```bash
npm run dev          # Start dev server (shopify app dev)
npm run build        # Build for production
npm run deploy       # Deploy to Shopify
npm run setup        # Generate Prisma client + run migrations
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

## Scopes

`read_products, write_products, read_metaobject_definitions, write_metaobject_definitions, read_metaobjects, write_metaobjects`

---

## Progress Tracker

| Feature | Status |
|---------|--------|
| Project configuration (shopify.app.toml) | Done |
| Prisma schema + Shop model | Done |
| Billing setup (3 plans) | Done |
| Server utilities (billing + metaobjects) | Done |
| Navigation update | Done |
| Home Dashboard page | Done |
| Recommendations page (CRUD) | Done |
| Pricing page | Done |
| How to Use page | Done |
| App Proxy route (recs + tracking) | Done |
| Theme App Extension (PDP block) | Done |
| Checkout UI Extension | Done |
| claude.md documentation | Done |
