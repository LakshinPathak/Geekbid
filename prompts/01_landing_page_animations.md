# Claude Code Prompt: Landing Page Animation Refinement

**Task:** Refine and upgrade the landing page animations in `web/src/app/page.tsx` and `web/src/app/globals.css` to make them significantly more premium, dynamic, and visually striking. The design system uses "Royal Dark" (gold `#c9a84c`, dark bg `#080b14`, panel bg `#0d1120`, text `#f0e8d4`, muted text `#a8997e`).

**IMPORTANT: Do NOT change the layout, content structure, or color scheme. Only enhance animations and add visual polish.**

## 1. Hero Section Entrance Animations (page.tsx lines 311-377)

Currently using basic `animate-fade-in-up` class (which doesn't even exist in globals.css). Replace with proper staggered entrance animations:

- The badge ("Live · Reverse Auction Platform") should fade in first with a subtle blur-to-clear effect
- The h1 headline should animate in with a staggered word reveal (each line slides up with 150ms delay)
- The subtitle paragraph should fade in with a slight upward motion after the headline
- CTAs should slide up staggered (200ms apart)
- Trust badges should fade in last with a stagger per badge
- The PriceDecayDemo card on the right should float in from the right with a slight scale-up

## 2. PriceDecayDemo Card Enhancement (page.tsx lines 48-124)

Make the live price decay demo feel more alive and premium:

- Add a subtle pulsing glow border around the entire card (gold, low opacity)
- When the price number changes, add a brief scale pulse + color flash (green → gold)
- The "LIVE" badge should have a gentle breathing animation with a dot that pulses
- The progress bar should have a subtle shimmer/gradient sweep moving along it
- Add tiny sparkle/ember particles that float up from the price when it decreases

## 3. Hero Background Enhancements (page.tsx lines 313-317)

- Make the ambient glow divs slowly drift/breathe (scale and opacity oscillation over 8-12s)
- Add a very subtle animated grid pattern (dots or fine lines) that fades in behind the hero, similar to the existing `grid-bg` class but with slow motion
- Add a very faint horizontal scan-line that moves from top to bottom slowly (like a CRT monitor effect, very subtle)

## 4. Social Proof Marquee (page.tsx lines 380-404)

- The marquee currently uses inline `@keyframes marquee`. Move it to globals.css properly
- Add a subtle glow/highlight effect to each item as it passes the center of the viewport
- Add gradient fade masks on left and right edges so items don't appear/disappear abruptly

## 5. Add Missing CSS Animation Classes in globals.css

The codebase references `animate-fade-in-up` but it's not defined in globals.css. Add these keyframes and utility classes:

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(24px); filter: blur(4px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
.animate-fade-in-up { animation: fade-in-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }

@keyframes fade-in-right {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
.animate-fade-in-right { animation: fade-in-right 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }

@keyframes breathe {
  0%, 100% { opacity: 0.06; transform: scale(1); }
  50% { opacity: 0.1; transform: scale(1.05); }
}

@keyframes subtle-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
.animate-subtle-float { animation: subtle-float 6s ease-in-out infinite; }
```

## 6. Section Scroll-Triggered Animations

The page already has `useInView` hook (line 34). Apply it to make each major section (Features at ~line 410, Steps/How It Works at ~line 450, Comparison Table, Testimonials, FAQ) animate in on scroll:

- Each section heading should fade-in-up when it enters viewport
- Cards/rows within each section should stagger their entrance with 80ms delay increments
- Use `style={{ animationDelay: `${index * 80}ms` }}` pattern

## Key Files

- `web/src/app/page.tsx` — main landing page (882 lines)
- `web/src/app/globals.css` — global CSS with existing animation definitions (starts at line 181)

## Rules

- Keep ALL existing content, structure, and colors intact
- Don't break the PriceDecayDemo timer/counter logic
- Use CSS animations where possible (not heavy JS)
- All animations should be subtle and premium — not flashy or distracting
- Ensure `animation-fill-mode: both` so elements stay hidden until their delay triggers
- The page should feel like a premium fintech landing page (think Linear, Stripe, Vercel aesthetic)
