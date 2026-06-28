# 13 — Shared Design Tokens & CSS Utilities

> **Design Components:** All 19 components share these tokens  
> **Target File:** `web/src/app/globals.css` + `tailwind.config.ts`

---

## Master Design Token Reference

### Color Palette

```css
:root {
    /* Surface Hierarchy */
    --surface-base: #0A0A0F;       /* Page background */
    --surface-1: #12121A;          /* Card backgrounds */
    --surface-2: #1A1A24;          /* Elevated cards, hover states */
    --surface-3: #1E1E2A;          /* Borders, dividers */
    
    /* Primary (Emerald) */
    --primary: #00FF88;            /* Main action color */
    --primary-hover: #00CC6A;      /* Hover state */
    --primary-container: #00FF88;  /* Same in this system */
    --primary-glow: rgba(0, 255, 136, 0.15);  /* Glow shadows */
    --primary-muted: rgba(0, 255, 136, 0.1);  /* Background tints */
    
    /* Text Hierarchy */
    --text-primary: #E8E8EC;       /* Headlines, primary text */
    --text-secondary: #8A8A9A;     /* Body text, descriptions */
    --text-tertiary: #6E6E85;      /* Muted text, labels */
    
    /* Semantic Colors */
    --error: #EF4444;
    --warning: #EAB308;
    --success: #00FF88;
    --info: #3B82F6;
    
    /* Glass Tokens */
    --glass-bg: rgba(31, 31, 37, 0.4);
    --glass-border: rgba(59, 75, 61, 0.3);
    --glass-blur: 24px;
    
    /* Typography Scale */
    --font-heading: 'Space Grotesk', system-ui, sans-serif;
    --font-body: 'Inter', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Typography Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `display-lg` | 48px | 700 | Hero headlines |
| `display-md` | 36px | 700 | Section headers |
| `heading-lg` | 24px | 700 | Page titles |
| `heading-md` | 20px | 600 | Card titles |
| `heading-sm` | 16px | 600 | Sub-headers |
| `body-lg` | 16px | 400 | Body text |
| `body-md` | 14px | 400 | Default body |
| `body-sm` | 12px | 400 | Captions, labels |
| `mono` | 14px | 400 | Code, amounts, IDs |

### Spacing Scale

```css
/* 4px base unit */
--space-1: 4px;    --space-2: 8px;    --space-3: 12px;
--space-4: 16px;   --space-5: 20px;   --space-6: 24px;
--space-8: 32px;   --space-10: 40px;  --space-12: 48px;
--space-16: 64px;  --space-20: 80px;
```

### Border Radius Scale

```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-2xl: 24px;
--radius-full: 9999px;
```

---

## Shared CSS Utility Classes

### Glass Panel System

```css
/* Base Glass Panel */
.glass-panel {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
}

/* Glass Panel Variants */
.glass-panel-sm {
    backdrop-filter: blur(12px);
    border-radius: var(--radius-md);
}
.glass-panel-lg {
    backdrop-filter: blur(40px);
    border-radius: var(--radius-2xl);
}
```

### Grid Overlay Background

```css
.grid-bg {
    background-image: 
        linear-gradient(rgba(0, 228, 121, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 228, 121, 0.03) 1px, transparent 1px);
    background-size: 32px 32px;
}
```

### Neon Glow Effects

```css
.glow-green {
    box-shadow: 0 0 30px rgba(0, 255, 136, 0.15);
}
.glow-green-hover:hover {
    box-shadow: 0 0 50px rgba(0, 255, 136, 0.25);
}
.glow-border {
    border-color: rgba(0, 255, 136, 0.3);
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.1);
}
```

### Scanline Animation

```css
@keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
}
.scanline::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(transparent, rgba(0, 255, 136, 0.02), transparent);
    animation: scanline 8s linear infinite;
    pointer-events: none;
}
```

### Text Gradient

```css
.text-gradient {
    background: linear-gradient(135deg, #ffffff, #00ff88);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
```

### Standard Animations

```css
/* Fade In Up */
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
    animation: fadeInUp 0.5s ease-out forwards;
}

/* Pulse Glow */
@keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.4); }
    50% { box-shadow: 0 0 0 12px rgba(0, 255, 136, 0); }
}
.animate-pulse-glow {
    animation: pulseGlow 2s infinite;
}

/* Scale In */
@keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}
.animate-scale-in {
    animation: scaleIn 0.3s ease-out forwards;
}
```

### Form Input Glass Style

```css
.input-glass {
    background: rgba(10, 10, 15, 0.6);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    transition: border-color 0.3s, box-shadow 0.3s;
}
.input-glass:focus {
    border-color: rgba(0, 255, 136, 0.5);
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.15);
    outline: none;
}
.input-glass::placeholder {
    color: var(--text-tertiary);
}
```

### Button Variants

```css
/* Primary CTA */
.btn-primary {
    background: var(--primary);
    color: var(--surface-base);
    font-weight: 600;
    border-radius: var(--radius-md);
    transition: all 0.3s ease;
}
.btn-primary:hover {
    background: var(--primary-hover);
    box-shadow: 0 0 30px var(--primary-glow);
}

/* Glass Button */
.btn-glass {
    background: var(--primary-muted);
    color: var(--primary);
    border: 1px solid rgba(0, 255, 136, 0.3);
    backdrop-filter: blur(12px);
    border-radius: var(--radius-md);
    transition: all 0.3s ease;
}
.btn-glass:hover {
    background: rgba(0, 255, 136, 0.2);
    box-shadow: 0 0 30px var(--primary-glow);
}

/* Ghost Button */
.btn-ghost {
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--surface-3);
    border-radius: var(--radius-md);
    transition: all 0.3s ease;
}
.btn-ghost:hover {
    background: var(--surface-2);
    color: var(--text-primary);
}
```

---

## Tailwind Config Extensions

```js
// tailwind.config.ts additions
{
    extend: {
        colors: {
            surface: {
                base: '#0A0A0F',
                1: '#12121A',
                2: '#1A1A24',
                3: '#1E1E2A',
            },
            primary: {
                DEFAULT: '#00FF88',
                hover: '#00CC6A',
                glow: 'rgba(0, 255, 136, 0.15)',
                muted: 'rgba(0, 255, 136, 0.1)',
            },
        },
        fontFamily: {
            heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
            body: ['Inter', 'system-ui', 'sans-serif'],
            mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        },
        backdropBlur: {
            glass: '24px',
            'glass-lg': '40px',
        },
        borderRadius: {
            glass: '20px',
        },
    }
}
```

---

## Implementation Checklist

- [ ] Add all CSS custom properties to `globals.css`
- [ ] Create `.glass-panel` utility class system
- [ ] Add `.grid-bg` background utility
- [ ] Implement all animation keyframes
- [ ] Add `.input-glass` form styling
- [ ] Create `.btn-primary`, `.btn-glass`, `.btn-ghost` variants
- [ ] Extend Tailwind config with new tokens
- [ ] Add Google Fonts import (Space Grotesk + Inter + JetBrains Mono)

## File Changes Required

| File | Action |
|------|--------|
| `web/src/app/globals.css` | Major additions — all tokens + utilities |
| `web/tailwind.config.ts` | Extend color, font, blur, radius scales |
| `web/src/app/layout.tsx` | Add Google Fonts links |
