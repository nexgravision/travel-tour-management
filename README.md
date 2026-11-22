# NexGravision Tours & Travel

A premium, editorial-luxury travel agency website frontend — handcrafted with
vanilla HTML, CSS and JavaScript. No frameworks, no build step, no dependencies.

**Design direction:** earth tones - warm cream surfaces, espresso darks, Playfair
Display serif headlines with Inter for UI, muted brick clay for warm emphasis
(prices, CTAs) and mossy olive green for the organic accent (links, focus, tags).
A harmonised, boutique palette.

## Features

- **Static showcase** — no backend, database, booking or appointment flow; every
  section is plain HTML you can edit directly in `index.html`
- **Full-screen hero** with cinematic backdrop and CTA buttons
- **Destinations** — 8 cards with real pricing, ratings and details
- **Tour packages** — domestic & international with tabbed filtering and wishlist toggles
- **Popular tours**, **services** (flights, hotels, holidays, honeymoon, group, custom), **about** with animated counters
- **Gallery** with keyboard-accessible lightbox (focus trap, arrow navigation)
- **Testimonials** slider with autoplay, swipe and ARIA tab pattern
- **Contact section** with call, email, office address and head-office details
- **Legal modals** (privacy / terms / cookies), toasts, back-to-top, sticky hide-on-scroll header
- Fully **responsive** (1440 → 360 px), WCAG AA contrast, `prefers-reduced-motion` respected

## Tech

| Layer | Details |
|---|---|
| Markup | Semantic HTML5, accessible landmarks & ARIA |
| Styling | Token-driven CSS (design tokens → base → components → sections) |
| Behaviour | Vanilla ES5-style IIFEs, one module per feature |
| Type | Playfair Display + Inter (Google Fonts) |
| Images | Hot-linked from Unsplash (verified URLs) |

## Structure

```
index.html
css/
  tokens.css          design tokens (colour, type, spacing, motion)
  base.css            reset, typography, layout, scroll-reveal
  components.css      buttons, fields, header, stats, overlays
  sections/*.css      one stylesheet per section
js/
  main.js             shared helpers (NG namespace, anchors, toasts)
  modules/*.js        nav, reveal, tabs, gallery,
                      testimonials, modal
```

## Run locally

Open `index.html` directly, or serve the folder:

```bash
npx serve .
# or
python -m http.server 8080
```

## Verification

- axe-core: 0 violations · Lighthouse: 100 / 100 / 100 (a11y, best practices, SEO)
- 265 behavioural assertions passing (jsdom test harness)
- No horizontal overflow at 1440 / 1024 / 768 / 390 / 360 px

---

© 2026 NexGravision Tours & Travel
