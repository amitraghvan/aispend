# Frontend Architecture — Phase 4

## Overview

Phase 4 delivers a production-grade SaaS frontend experience built on top of the Phase 1-3 backend. The design targets the aesthetic quality of Stripe, Vercel, and Linear.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 + CSS Custom Properties |
| Animation | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| Typography | Geist Sans / Geist Mono (Google Fonts) |
| Utilities | clsx |

## Design System

### Color Tokens (CSS Custom Properties)
```
--primary: #6d28d9 (light) / #8b5cf6 (dark)
--accent: #4f46e5 (light) / #6366f1 (dark)
--success: #059669 / #10b981
--warning: #d97706 / #f59e0b
--destructive: #dc2626 / #ef4444
```

### Components (src/components/ui/index.tsx)
| Component | Description |
|-----------|------------|
| Button | 5 variants (primary, secondary, ghost, destructive, outline) × 3 sizes |
| Input | With label, error, hint support |
| Select | Styled native select with options |
| Card | With hover and glow variants |
| Badge | 6 variants with optional dot indicator |
| KpiCard | Dashboard metric card with icon, trend, gradient overlay |
| Progress | Animated progress bar with color logic |
| ScoreRing | SVG animated ring gauge (0-100) |
| Skeleton | Loading placeholder |
| Spinner | SVG loading spinner |
| Section | Landing page section wrapper |
| StepIndicator | Multi-step wizard progress |
| FadeIn / FadeInView | Motion wrappers for animations |

## Pages

### Landing Page (`/`)
8 sections: Hero → Problem → How It Works → Features → Savings Examples → Testimonials → FAQ → CTA

### Audit Wizard (`/audit`)
5-step flow: Company → Tool Selection → Subscription Details → Review → Run Audit

### Results Dashboard (`/audit/results`)
Sections: KPI Row → Health Score + Pie Chart → Recommendations Panel → Overlap Analysis → Benchmarks → Lead Capture → Share Link

## User Flow
```
[Landing Page] → [Start Free Audit] → [Audit Wizard]
    Step 1: Company Info
    Step 2: Select AI Tools (grid)
    Step 3: Enter plan, seats, spend per tool
    Step 4: Review summary
    Step 5: Animated processing
→ [Results Dashboard]
    → Enter email (lead capture)
    → Copy share link
```

## Mobile Responsive
- All layouts use CSS Grid with responsive breakpoints
- Navigation adapts to mobile (hidden nav links, persistent CTA)
- Cards stack vertically on small screens
- Charts resize via ResponsiveContainer

## Dark Mode
- Automatic via `prefers-color-scheme: dark` media query
- All components use CSS custom properties
- No class toggling required

## Animations
- Scroll-triggered section reveals (FadeInView)
- Step-by-step audit processing animation
- Health score ring animation
- Progress bar fills
- Card hover effects
- FAQ accordion

## Performance Optimizations
- `'use client'` only on pages that need interactivity
- Layout remains a Server Component
- Suspense boundary on results page for searchParams
- No unnecessary re-renders (useCallback on form state)
