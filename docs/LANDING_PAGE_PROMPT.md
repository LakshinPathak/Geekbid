# GeekBid Landing Page — Claude Code Prompt

Copy everything below the line and paste it as your prompt:

---

Create a React + Vite + TypeScript + Tailwind CSS landing page for a reverse-auction freelance marketplace called "GeekBid". The page has 5 sections: Hero, How It Works, Features, Testimonials, and CTA Footer. Use framer-motion for animations and lucide-react for icons. The design is dark, premium, and futuristic with electric green accents on a deep charcoal base — think Bloomberg terminal meets modern SaaS.

FONTS

Load two Google Fonts in index.html:

Inter (weights: 300, 400, 500, 600, 700, 800) -- used as the global default font
Space Grotesk (weights: 400, 500, 600, 700) -- used for headings, hero text, and numerical displays

In index.css, set the global font family:

```css
* { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
```

In tailwind.config.js, extend:

```js
colors: {
  accent: '#00FF88',
  'accent-dim': '#00CC6A',
  surface: '#0A0A0F',
  'surface-raised': '#12121A',
  'surface-elevated': '#1A1A24',
  border: '#1E1E2A',
  'text-primary': '#E8E8EC',
  'text-secondary': '#8A8A9A',
  'text-muted': '#55556A',
},
fontFamily: {
  heading: ['"Space Grotesk"', 'sans-serif'],
}
```

COLOR SYSTEM

- Background: #0A0A0F globally applied to body
- Cards: #12121A with border border-[#1E1E2A]
- Accent green: #00FF88 for CTAs, active states, price numbers, checkmarks
- Primary text: #E8E8EC
- Secondary text: #8A8A9A
- Muted text: #55556A
- Gradients: Use green-to-transparent gradients sparingly for glow effects

CUSTOM CSS UTILITIES (index.css)

```css
.grid-overlay {
  background-image: 
    linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}

.glow-green {
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.15), 0 0 60px rgba(0, 255, 136, 0.05);
}

.gradient-border {
  background: linear-gradient(135deg, rgba(0, 255, 136, 0.2), transparent 50%, rgba(0, 255, 136, 0.1));
  padding: 1px;
}

@keyframes priceDecay {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.price-pulse { animation: priceDecay 2s ease-in-out infinite; }

.scanline::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 136, 0.01) 2px,
    rgba(0, 255, 136, 0.01) 4px
  );
  pointer-events: none;
}
```

SECTION 1: HERO

Full viewport height (min-h-screen), relative, overflow-hidden. Background is #0A0A0F with the .grid-overlay pattern covering the entire section at opacity-100.

Top-left green glow: An absolutely positioned div at top-[-200px] left-[-200px], w-[500px] h-[500px], bg-accent/5 rounded-full blur-[120px]. Another smaller glow at top-right: top-[-100px] right-[-150px], w-[300px] h-[300px], bg-accent/3 rounded-full blur-[100px].

Navbar:
- Sticky top-0, z-50, bg-surface/80 backdrop-blur-xl border-b border-border
- Max-w-7xl mx-auto, px-6, h-16, flex items-center justify-between
- Left: GeekBid logo — text "GeekBid" in font-heading font-bold text-xl text-text-primary, with a small green dot (w-2 h-2 bg-accent rounded-full inline-block) after "Geek" and before "Bid"
- Center: 5 nav links: "How it works", "Features", "Pricing", "For Teams", "Docs" — text-text-secondary text-sm hover:text-text-primary transition-colors
- Right: Two buttons — "Log in" (text-text-secondary text-sm hover:text-text-primary) and "Start Free" (bg-accent text-surface font-medium text-sm px-4 py-2 rounded-lg hover:bg-accent-dim transition-colors)
- Framer motion: entire navbar slides down from y:-20 with opacity 0→1, duration 0.6s, ease [0.16, 1, 0.3, 1]

Hero Content (vertically centered, max-w-5xl mx-auto, text-center, px-6):

- Top badge: inline-flex items-center gap-2, border border-accent/20 rounded-full px-4 py-1.5 bg-accent/5
  - Small green circle (w-1.5 h-1.5 bg-accent rounded-full) with pulse animation
  - Text: "Reverse auctions are live" in text-accent text-xs sm:text-sm font-medium
  - Framer motion: fade in from y:10, delay 0.2s

- Main heading (font-heading):
  - Line 1: "The marketplace where" in text-text-primary
  - Line 2: "prices go down." in text-accent
  - Sizes: text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.05] tracking-[-0.03em]
  - Each line is a separate element. Line 2 has a subtle .glow-green text-shadow
  - Framer motion: WordsPullUp animation — each word slides up from y:30, staggered 0.06s, triggered by useInView

- Subheading below (mt-6 sm:mt-8):
  - "Post your project. Watch the price decay in real-time. Hire the best freelancer at the best price — guaranteed."
  - text-text-secondary text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed
  - Framer motion: fade up from y:20, delay 0.5s, ease [0.16, 1, 0.3, 1]

- CTA buttons row (mt-8 sm:mt-10, flex items-center justify-center gap-4):
  - Primary: "Post a Job — Free" — bg-accent text-surface font-semibold text-base px-8 py-3.5 rounded-xl hover:bg-accent-dim transition-all duration-300 hover:scale-[1.02] .glow-green. Has ArrowRight icon (lucide) inside, size 18, ml-2
  - Secondary: "Watch a demo" — border border-border text-text-primary font-medium text-base px-8 py-3.5 rounded-xl hover:bg-surface-raised transition-all duration-300. Has Play icon (lucide) inside, size 16, ml-2
  - Framer motion: fade up from y:20, delay 0.7s

- Live price ticker strip (mt-12 sm:mt-16):
  - A horizontal strip showing 3 mock jobs with decaying prices
  - Contained in a border border-border rounded-2xl bg-surface-raised/50 backdrop-blur-sm p-4 sm:p-6 max-w-3xl mx-auto
  - 3 columns (grid grid-cols-1 sm:grid-cols-3 gap-4 sm:divide-x sm:divide-border):
    - Each shows: job title (text-text-primary text-sm font-medium truncate), current price in green (text-accent font-heading text-2xl font-bold .price-pulse), decay rate (text-text-muted text-xs)
    - Job 1: "AI Chatbot Build" — $680 — -$15/hr
    - Job 2: "K8s Security Audit" — $1,140 — -$20/hr  
    - Job 3: "DeFi Smart Contract" — $2,325 — -$35/hr
  - The prices should animate — use a useEffect with setInterval (every 3 seconds) to decrease each price by a small amount, clamped at a minimum
  - Framer motion: fade up from y:30, delay 1.0s, duration 0.8s

SECTION 2: HOW IT WORKS

bg-surface, py-24 sm:py-32, relative. Top has a thin horizontal line (h-px bg-gradient-to-r from-transparent via-border to-transparent).

Section header (text-center, max-w-3xl mx-auto, px-6):
- Small label: "HOW IT WORKS" in text-accent text-xs font-semibold tracking-[0.2em] uppercase
- Heading: "Three steps to your perfect hire." in font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mt-4 leading-tight
- Framer motion: WordsPullUp animation

3-step horizontal flow (mt-16 sm:mt-20, max-w-5xl mx-auto, px-6):
- Grid: grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6
- Between each card on md+, show a connecting dashed line (hidden on mobile)

Each step card (text-center md:text-left):
- Step number: font-heading text-6xl sm:text-7xl font-bold text-accent/10 leading-none (e.g. "01", "02", "03")
- Icon circle: w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mt-4
  - Step 1: FileText icon (lucide), text-accent, size 22
  - Step 2: TrendingDown icon (lucide), text-accent, size 22  
  - Step 3: Handshake icon (lucide), text-accent, size 22
- Title: font-heading text-lg sm:text-xl font-semibold text-text-primary mt-4
  - Step 1: "Post your project"
  - Step 2: "Watch the price drop"
  - Step 3: "Hire & pay securely"
- Description: text-text-secondary text-sm sm:text-base mt-2 leading-relaxed
  - Step 1: "Describe your project, set a starting price and floor. Your job goes live instantly to our global network of verified freelancers."
  - Step 2: "The price decays automatically over time. Freelancers compete by accepting at the right moment or submitting counter-bids below market rate."
  - Step 3: "Funds are held in escrow until you approve the work. 10% platform fee. No surprises. Dispute resolution built in."
- Framer motion: each card fades in from y:30, staggered 0.2s apart, triggered by useInView (once, margin "-50px")

SECTION 3: FEATURES

bg-surface, py-24 sm:py-32, relative. Has .scanline pseudo-element for subtle terminal effect.

Section header (text-center, max-w-3xl mx-auto, px-6):
- Label: "FEATURES" in text-accent text-xs font-semibold tracking-[0.2em] uppercase
- Heading line 1: "Everything you need to" in text-text-primary
- Heading line 2: "ship faster." in text-accent
- font-heading text-3xl sm:text-4xl md:text-5xl font-bold leading-tight

Bento grid (mt-16, max-w-6xl mx-auto, px-6):
- On lg+: 3 columns. On md: 2 columns. On mobile: 1 column. Gap: gap-3 sm:gap-4

Card style (shared): bg-surface-raised border border-border rounded-2xl p-6 sm:p-8 overflow-hidden relative group hover:border-accent/20 transition-all duration-500. On hover, a subtle green gradient line appears at top edge.

Card 1 — "Real-Time Price Decay" (lg:col-span-2):
- Top: animated price display mockup — a mini terminal box: bg-surface rounded-xl p-4 border border-border
- Shows: "Build AI Chatbot" title, starting price "$800" crossed out, current price "$647" in text-accent text-3xl font-heading font-bold with .price-pulse, a progress bar animating from 100% to 40%
- Below: "Floor: $350 · Decay: $15/hr · 10h remaining" in text-text-muted text-xs
- Title: "Real-Time Price Decay" + description text

Card 2 — "Escrow Protection" (single column):
- Shield icon from lucide in text-accent
- 3 mini status pills: "Held" (yellow), "Released" (green), "Disputed" (red)

Card 3 — "Counter-Bidding" (single column):
- MessageSquare icon. Mock bid list with 2 rows: "Arjun Dev $520 Score:712" and "Leo Chen $580 Score:456"

Card 4 — "Built-in Chat" (single column):
- MessageCircle icon from lucide

Card 5 — "Smart Notifications" (single column):
- Bell icon from lucide

Card 6 — "GeekScore Reputation" (lg:col-span-2):
- Award icon. Large "845" score display in text-accent, with 3 horizontal progress bars (Quality 92%, Speed 88%, Satisfaction 95%)

All cards: Framer motion staggered entrance — scale from 0.97, opacity 0→1, staggered 0.1s, ease [0.22, 1, 0.36, 1], triggered by useInView

SECTION 4: TESTIMONIALS

bg-surface, py-24 sm:py-32.

Section header: Label "TRUSTED BY BUILDERS", Heading "What our community says."

3 testimonial cards (grid grid-cols-1 md:grid-cols-3, gap-6):
Each: bg-surface-raised border border-border rounded-2xl p-6 sm:p-8 hover:border-accent/20. 5 green stars at top, quote text, bottom: avatar circle + name + role.

1. ★★★★★ "Posted a security audit at $1,200. Watched it decay to $890 and got an OSCP-certified engineer. Saved 26% vs traditional platforms." — Maya Sharma, CTO at NexaAI Labs (MS)
2. ★★★★★ "The counter-bidding changed everything. I set my price, freelancers compete — and I always get fair market value. Escrow gives me peace of mind." — Derek Olsen, Founder at FinLeap (DO)
3. ★★★★★ "As a freelancer, I love the transparency. I see the price, I see the decay rate, I decide when to strike. No more lowball negotiations." — Arjun Dev, Senior Full-Stack Engineer (AD)

Framer motion: staggered fade-in from y:20, 0.15s apart

SECTION 5: CTA FOOTER

bg-surface, pt-24 pb-12.

CTA block (max-w-4xl mx-auto, text-center): bg-surface-raised border border-border rounded-3xl p-12 sm:p-16 relative overflow-hidden. Green glow behind. Heading "Ready to flip the auction?" + CTA "Get Started — It's Free" with ArrowRight. Below: "No credit card required · 10% platform fee only on completed jobs"

Footer bar (mt-16 sm:mt-24, border-t border-border, pt-8): Logo + copyright left, links (Privacy, Terms, Contact, GitHub) right.

SHARED ANIMATION COMPONENTS

WordsPullUp: Splits text by spaces, each word slides up (y:30 to 0, opacity 0 to 1), staggered 0.06s, useInView (once: true).

RESPONSIVE BREAKPOINTS

Fully responsive. Bento grid: 1-col → 2-col (md) → 3-col (lg). Hero heading: text-4xl → text-8xl. Price ticker: stacked → 3-col (sm). Navbar: hamburger menu on mobile with Menu icon.

TECH STACK

- Vite + React 18 + TypeScript
- Tailwind CSS 3
- framer-motion
- lucide-react (ArrowRight, Play, FileText, TrendingDown, Handshake, Shield, MessageSquare, MessageCircle, Bell, Award, Star, Check, Menu, X)
