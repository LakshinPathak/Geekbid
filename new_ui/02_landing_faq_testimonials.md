# 02 — Landing FAQ & Testimonials

> **Design Component:** `landing_page_faq_testimonials`  
> **Target File:** `web/src/app/page.tsx` (Testimonials & FAQ sections, lower half)

---

## Current Production State

The landing page contains:
- **Testimonials** — simple card grid with quotes, names, roles
- **FAQ section** — not currently present or minimal accordion
- Both use flat `bg-[#12121A]` cards with `border-[#1E1E2A]`

## Design System Upgrade

### FAQ Accordion

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Layout | Simple list or missing | Animated accordion with expand/collapse |
| Container | Flat card | Glass-panel with `backdrop-filter: blur(24px)` |
| Chevron | None | Rotating chevron icon on toggle |
| Animation | None | CSS `max-height` transition (300ms ease-out) |
| Border | Static | Active item gets `border-primary-container` glow |

### Testimonial Bento Grid

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Layout | Simple grid | Asymmetric bento grid (2×2, 1 large + 2 small) |
| Cards | Flat | Glass-panel with subtle hover lift |
| Avatar | Text initial | Circular avatar with emerald ring border |
| Rating | None | Star rating display (yellow-500 fill) |
| Role Badge | Plain text | `bg-primary-container/10` pill badge |

### Key CSS Additions

```css
/* FAQ Accordion */
.faq-item {
    background: rgba(31, 31, 37, 0.4);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(59, 75, 61, 0.3);
    border-radius: 16px;
    overflow: hidden;
    transition: border-color 0.3s ease;
}
.faq-item.active {
    border-color: rgba(0, 255, 136, 0.3);
}

/* Testimonial Bento */
.testimonial-card {
    background: rgba(31, 31, 37, 0.3);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(59, 75, 61, 0.2);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.testimonial-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}
```

---

## Implementation Checklist

- [ ] Create `FAQAccordion` component with animated expand/collapse
- [ ] Redesign testimonial grid to bento layout
- [ ] Add glass-panel styling to both sections
- [ ] Add hover animations to testimonial cards
- [ ] Implement rotating chevron on FAQ items
- [ ] Add star rating display to testimonial cards

## API Dependencies

| Endpoint | Usage |
|----------|-------|
| None (static) | FAQ content is hardcoded; testimonials use static data |

## File Changes Required

| File | Action |
|------|--------|
| `web/src/app/page.tsx` | Modify FAQ + Testimonials sections |
| `web/src/app/globals.css` | Add `.faq-item`, `.testimonial-card` classes |
