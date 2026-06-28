# 07 — Post Job Wizard

> **Design Component:** `geekbid_post_job_wizard`  
> **Target File:** `web/src/app/post-job/page.tsx` (836 lines)

---

## Current Production State

An 836-line multi-step form wizard with:
- **Step 1 (Details)** — Title, Description, Category dropdown, Skills picker, Visibility toggle
- **Step 2 (Pricing)** — Starting Price, Minimum Price, Decay Rate, Deadline, Pricing Mode (Fixed/Adaptive), Hours to Floor, Interactive Decay Curve Preview (SVG chart)
- **Step 3 (Review)** — Summary of all fields + Submit button
- **DecayCurvePreview** — Custom SVG chart with scrubbing, hover tooltips, dual-curve display (fixed vs adaptive)
- **Step navigation** — Progress dots + Next/Back buttons

## Design System Upgrade

### Wizard Chrome

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Background | Flat `#0A0A0F` | Grid background with subtle shader |
| Step Container | `bg-[#12121A]` card | Glass-panel with inner glow |
| Progress Bar | 3 dots with connecting lines | Animated glass progress bar with emerald fill |
| Step Labels | Simple text | Icon + label with completion checkmarks |
| Navigation Buttons | Standard buttons | Glass CTA with hover glow |

### Decay Curve Preview (Most Complex Component)

| Element | Current | Design System Target |
|---------|---------|---------------------|
| SVG Container | Plain SVG in card | Glass-panel with scanline animation overlay |
| Curve Lines | `#00FF88` stroke | Neon glow stroke with `filter: drop-shadow()` |
| Grid Lines | `#1E1E2A` strokes | Emerald-tinted grid at 5% opacity |
| Hover Tooltip | Basic text at cursor | Glass-panel tooltip with price + time |
| Area Fill | `#00FF88/10` fill | Gradient fill with animated pulse |
| Floor Line | Dashed red line | Animated red pulse line |
| Adaptive Curve | `#FF6B35` secondary | Gradient orange with glow effect |

### Key CSS Additions

```css
/* Wizard Glass Step */
.wizard-step {
    background: rgba(31, 31, 37, 0.4);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(59, 75, 61, 0.3);
    border-radius: 20px;
}

/* Animated Progress Bar */
.wizard-progress {
    height: 4px;
    background: rgba(30, 30, 42, 0.5);
    border-radius: 4px;
    overflow: hidden;
}
.wizard-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #00ff88, #00e479);
    border-radius: 4px;
    transition: width 0.5s ease-out;
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
}

/* Decay Chart Neon Glow */
.decay-curve-line {
    stroke: #00ff88;
    stroke-width: 2;
    fill: none;
    filter: drop-shadow(0 0 6px rgba(0, 255, 136, 0.4));
}
```

---

## Implementation Checklist

- [ ] Upgrade step containers to glass-panel
- [ ] Add animated progress bar
- [ ] Upgrade decay curve SVG with neon glow strokes
- [ ] Add glassmorphic tooltips to decay chart
- [ ] Upgrade form inputs to glass-styled variants
- [ ] Add step transition animations (slide + fade)
- [ ] Upgrade Submit CTA with neon glow
- [ ] Add scanline overlay to decay chart container

## API Dependencies

| Endpoint | Usage |
|----------|-------|
| `POST /api/jobs` | Job creation on final submit |

## File Changes Required

| File | Action |
|------|--------|
| `web/src/app/post-job/page.tsx` | Visual overhaul of wizard + decay chart |
| `web/src/app/globals.css` | Add `.wizard-step`, `.wizard-progress`, `.decay-curve-line` |
