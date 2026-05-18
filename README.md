# ReviewBoost — Google Review Automation Platform

A complete SaaS platform for restaurants, hotels, and bars to collect Google reviews via QR codes.

## Features

- ✅ Dynamic QR code generation per customer
- ✅ Permanent slug architecture (QR never needs reprinting)
- ✅ Multi-client support from single codebase
- ✅ Dynamic branding (logo + brand color per client)
- ✅ Private feedback capture for 1-3 star reviews
- ✅ Admin dashboard with analytics
- ✅ Mobile-optimized review page
- ✅ Zero AI running cost

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Database**: Supabase (PostgreSQL) + Row Level Security
- **Hosting**: Cloudflare Pages
- **Storage**: Supabase Storage (logos)
- **Code**: GitHub

## Setup

### Prerequisites

1. Node.js 18+
2. Supabase project created and database schema initialized
3. Cloudflare account
4. GitHub repository

### Installation

```bash
npm install
cp .env.local.example .env.local
# Fill in your Supabase credentials in .env.local
npm run dev
```

Open http://localhost:3000 in your browser.

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000 (dev) or https://reviewboost.in (prod)
```

## Admin Panel

Access at `/admin` after login.

### Routes

- `/admin` — Dashboard
- `/admin/customers` — All customers
- `/admin/customers/new` — Add customer
- `/admin/customers/[id]` — Edit customer
- `/admin/customers/[id]/qr` — QR download
- `/admin/templates` — Review templates
- `/admin/analytics` — Scan analytics
- `/admin/feedback` — Private feedback inbox

## Customer Review Page

Each customer gets a unique, permanent URL:

```
https://reviewboost.in/taj-hotel-mumbai
```

QR code embeds this slug and never changes, even after renewal or plan upgrade.

## Deployment

### To Cloudflare Pages

1. Push code to GitHub
2. Connect repo to Cloudflare Pages
3. Set build command: `npm run build`
4. Set output directory: `.next`
5. Add all env variables in Cloudflare Settings
6. Auto-deploys on every git push

### Custom Domain

1. Register domain in Cloudflare Domains
2. Add custom domain in Pages project settings
3. SSL auto-activates

## Database Schema

- `customers` — Business owner info
- `business_pages` — Review page config + branding
- `review_templates` — Global review templates (4-star, 5-star)
- `scan_sessions` — Analytics (every scan, star, submission)
- `private_feedback` — Negative feedback (1-3 stars)
- `renewal_history` — Plan renewal audit trail

## Support

For issues, check the GitHub repository.
