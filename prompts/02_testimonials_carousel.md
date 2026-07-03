# Claude Code Prompt: Testimonials Carousel with Image Placeholders

**Task:** Refactor the Testimonials section in `web/src/app/page.tsx` (lines 643-734) from a static 3-column grid to a horizontally auto-scrolling carousel with image placeholders.

**Design System:** Royal Dark theme — gold `#c9a84c`, bg `#080b14`, panel bg `#0d1120`, card bg `#0a0d18`, text `#f0e8d4`, muted `#a8997e`. Font heading: Georgia/serif. Font body: Inter/sans-serif.

## Current State

- Section is at lines 643-734 in `page.tsx`
- Uses a `grid grid-cols-1 md:grid-cols-3 gap-5` layout (line 662)
- Each testimonial card has a gradient initials avatar (line 705: a `h-11 w-11 rounded-full` div with `t.avatar` initials like "DO", "PS", "MC")
- Data is in the `TESTIMONIALS` array (lines 213-256) with fields: quote, name, title, company, avatar, avatarGrad, ring, accent, tag, tagBg, saved, rating

## Changes Required

### A. Replace initials avatar with image placeholder

On each testimonial card (line 704-708), replace the gradient-circle initials avatar with a proper image placeholder:

- Use a `60px × 60px` (`h-15 w-15`) rounded-full div
- Fill it with a subtle gradient background: `bg-gradient-to-br from-[rgba(201,168,76,0.15)] to-[rgba(201,168,76,0.05)]`
- Add a border: `border border-[rgba(201,168,76,0.25)]`
- Inside, render a generic user silhouette icon using Lucide's `User` icon (import it — it's not currently imported) at `h-7 w-7 text-[#a8997e]`
- Keep the green online dot indicator that's currently there (`span` with `bg-emerald-400`)
- This is a temporary placeholder — actual user photos will be added later

### B. Convert grid to horizontal auto-scrolling carousel

Replace the `grid grid-cols-1 md:grid-cols-3` layout with a carousel:

1. **Layout:** Use a horizontal scrollable container with CSS `overflow-x: auto` and `scroll-snap-type: x mandatory` on the cards container. Each card gets `scroll-snap-align: start` and a fixed `min-w-[340px] max-w-[400px]` width.

2. **Auto-scroll:** Add a React `useEffect` that auto-scrolls the carousel container horizontally by 1px every 30ms (smooth continuous scroll). When it reaches the end, loop back to the start seamlessly. Pause auto-scroll on hover (use `onMouseEnter`/`onMouseLeave` to toggle a ref).

3. **Duplicate cards for infinite loop effect:** Render `TESTIMONIALS` array twice (spread it: `[...TESTIMONIALS, ...TESTIMONIALS]`) so the carousel can loop smoothly. When `scrollLeft` reaches the midpoint (total width of original set), reset `scrollLeft` to 0 without animation.

4. **Fade masks:** Add gradient fade-out masks on both left and right edges of the carousel container using `::before` and `::after` pseudo-elements (or two absolutely-positioned divs):
   - Left: `bg-gradient-to-r from-[#080b14] to-transparent w-16`
   - Right: `bg-gradient-to-l from-[#080b14] to-transparent w-16`

5. **Hide scrollbar:** Add `scrollbar-hide` class (already defined in globals.css at line 374).

6. **Navigation dots (optional but nice):** Below the carousel, add small dots indicating which testimonial group is in view. Gold dot for active, muted for inactive.

### C. Keep everything else

- Keep the section heading ("Loved by engineers and clients alike"), subtitle, background decorations, and the bottom trust strip stats exactly as they are
- Keep the card internal layout (tag + stars, quote, result pill, divider, attribution) — only change the avatar and the outer container from grid to carousel
- Keep the `testimonialsSection.ref` on the section for the existing `useInView` scroll-trigger

## Key Files

- `web/src/app/page.tsx` — lines 643-734 for the testimonials section, lines 213-256 for TESTIMONIALS data
- Lucide icons are imported at line 6-12 — add `User` to the import list
