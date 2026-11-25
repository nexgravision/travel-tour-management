# NexGravision Tours & Travel

A premium, editorial-luxury travel agency website frontend — handcrafted with
vanilla HTML, CSS and JavaScript. No frameworks, no build step, no dependencies.

**Design direction:** premium navy + ivory + platinum (gold-free) - warm ivory
surfaces, deep navy ink and darks, Playfair Display serif headlines with Inter
for UI, steel-blue for the interactive accent (links, focus, tags) and platinum
grey for metallic hairlines and micro-labels. Classic first-class travel luxury.

## Features

- **Static showcase** — no backend, database, booking or appointment flow; every
  section is plain HTML you can edit directly in `index.html`
- **Full-screen hero** with cinematic backdrop and CTA buttons, driven by an
  interactive destination carousel: the destination copy (country eyebrow,
  big title + tagline, location line, description and the two CTA buttons)
  is anchored to the **bottom-left** of the hero at every screen size — the
  photo fills the space above it. On desktop (≥1100px) the copy and a
  **three-card window** sit side by side along the bottom, copy left and
  cards right (nav row — arrows left, `01 / 08` index right — beneath the
  cards); below 1100px the window flows beneath the copy. The cards are
  tall 3:5 tiles, height-capped on short (≤820px) laptop screens so the nav
  row stays above the fold at 1366×768. Exactly three cards fit the window;
  the track slides them one slot per destination (2 → 1, 3 → 2, 4 → 3 …) so
  a new card always enters from the right while the outgoing one's photo
  becomes the background. Picking a destination — by clicking its card, the
  prev/next arrows, or the ArrowLeft / ArrowRight keys while focus is inside
  the rail — crossfades that photo into the hero background while the
  country, title, location and description swap to match. The active card
  (first slot) is highlighted and carries `aria-pressed="true"`, the
  `01 / 08` counter follows it, and navigation wraps around at both ends
- **Hero auto-rotation** — the carousel advances through all 8 destinations
  every 6 seconds (the first advance lands 6s after page load), wraps from
  the last destination back to the first and loops forever instead of
  stopping on the last one, and only runs when there are 2 or more slides.
  It pauses only while the tab is hidden, while keyboard-initiated focus is
  inside the hero (`:focus-visible`), or while the hero is scrolled out of
  view (via IntersectionObserver — browsers without it simply keep
  rotating) — never when the pointer rests over the hero, and a tap on a
  touch device never pauses it either. Any manual interaction — clicking a
  destination card, the prev/next arrows, ArrowLeft / ArrowRight while
  focus is in the rail, or a programmatic `NG.heroGoTo` — restarts the full
  6-second countdown for the slide it selects. Automatic changes set the
  hero copy's `aria-live` to `"off"` so nothing is announced every 6
  seconds; manual changes set it to `"polite"` and are announced
- **Destinations** — 8 cards with real pricing, ratings and details
- **Tour packages** — domestic & international with tabbed filtering and wishlist toggles
- **Popular tours**, **services** (flights, hotels, holidays, honeymoon, group, custom), **about** with animated counters
- **Gallery** with keyboard-accessible lightbox (focus trap, arrow navigation)
- **Testimonials** slider with autoplay, swipe and ARIA tab pattern
- **Contact section** with call, email and office address
- Toasts, back-to-top, sticky hide-on-scroll header (single-bar navbar — the
  topbar strip was removed) with the social icons in the footer bottom bar
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
  modules/*.js        nav, hero, reveal, tabs, gallery,
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
