# GeekBid — Screen Redesign Prompts (Matching Landing Page Theme)

> Use these prompts one-by-one in Claude Code to redesign each screen.  
> All screens share the same design system established in the landing page.

---

## SHARED DESIGN SYSTEM (paste this before EVERY prompt below)

```
DESIGN SYSTEM CONTEXT (do NOT change these — they are already set up):

Colors:
  accent: '#00FF88' (electric green)
  accent-dim: '#00CC6A' (hover green)
  surface: '#0A0A0F' (page background)
  surface-raised: '#12121A' (card backgrounds)
  surface-elevated: '#1A1A24' (hover/elevated cards)
  border: '#1E1E2A' (subtle borders)
  text-primary: '#E8E8EC' (primary text)
  text-secondary: '#8A8A9A' (secondary text)
  text-muted: '#55556A' (muted text)

Fonts:
  Default body: 'Inter'
  Headings/numbers: font-heading = 'Space Grotesk'

Shared elements:
  - Cards: bg-surface-raised border border-border rounded-2xl
  - Buttons primary: bg-accent text-surface font-semibold rounded-xl hover:bg-accent-dim .glow-green
  - Buttons secondary: border border-border text-text-primary rounded-xl hover:bg-surface-raised
  - Input fields: bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/20
  - Status pills: rounded-full text-xs px-3 py-1 font-medium
  - Page backgrounds: bg-surface with subtle .grid-overlay where appropriate
  - All animations: framer-motion with ease [0.16, 1, 0.3, 1]
  - Icons: lucide-react in text-accent or text-text-secondary
  - Navbar: already built — sticky, dark, with green accent logo dot
```

---

## PROMPT 1: LOGIN / REGISTER PAGE

Redesign the `/login` page to match the GeekBid dark+green design system.

LAYOUT:
- Full viewport height (min-h-screen), bg-surface, flex items-center justify-center
- Split layout on lg+: left side = branding panel (lg:w-1/2), right side = form panel (lg:w-1/2)
- On mobile: single column, form only with branding elements above

LEFT PANEL (lg+ only):
- bg-surface-raised h-full relative overflow-hidden, p-12
- .grid-overlay at opacity-50 covering the panel
- Top-left green glow blob: absolute, w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] top-[-150px] left-[-150px]
- Bottom-right smaller glow: w-[250px] h-[250px] bg-accent/3 blur-[80px]
- Centered content:
  - GeekBid logo (same as navbar — "Geek" + green dot + "Bid") in font-heading text-3xl font-bold
  - Below: large tagline "The marketplace where prices go down." in font-heading text-4xl xl:text-5xl font-bold text-text-primary leading-tight mt-8. "prices go down." in text-accent
  - Below: 3 small feature pills (mt-8, flex flex-col gap-3):
    - "✦ Reverse auction pricing" — text-text-secondary text-sm
    - "✦ Escrow-protected payments" — text-text-secondary text-sm
    - "✦ Real-time price decay" — text-text-secondary text-sm
  - Bottom: a live price ticker (same as hero) showing 1 job decaying: "AI Chatbot Build — $647 — -$15/hr" in a mini card bg-surface border border-border rounded-xl p-4

RIGHT PANEL (form):
- max-w-md mx-auto w-full px-6 py-12
- Tab switcher at top: two tabs "Log in" and "Sign up" — inline-flex bg-surface-raised rounded-xl p-1 border border-border
  - Active tab: bg-accent text-surface font-medium text-sm px-6 py-2 rounded-lg
  - Inactive tab: text-text-secondary text-sm px-6 py-2 hover:text-text-primary
- Form heading below tabs (mt-8):
  - Login: "Welcome back." in font-heading text-2xl font-bold text-text-primary
  - Register: "Create your account." in font-heading text-2xl font-bold text-text-primary
  - Subtitle: "Enter your credentials to continue" in text-text-secondary text-sm mt-1

LOGIN FORM (mt-6, space-y-4):
- Email input: standard input style (see design system), with Mail icon (lucide) as left addon in text-text-muted
- Password input: same style, with Lock icon, and an eye toggle (Eye/EyeOff) on right
- "Forgot password?" link: text-accent text-xs hover:text-accent-dim, text-right
- Submit button: full-width bg-accent text-surface font-semibold py-3 rounded-xl hover:bg-accent-dim .glow-green, text "Log in" with ArrowRight icon
- Divider: flex items-center gap-4, two hr lines (border-border) with "or" text in text-text-muted text-xs between them
- Google OAuth button: full-width border border-border bg-surface-raised text-text-primary font-medium py-3 rounded-xl hover:bg-surface-elevated. Google "G" SVG icon on left. Text "Continue with Google"

REGISTER FORM (mt-6, space-y-4):
- Full name input with User icon
- Email input with Mail icon
- Password input with Lock icon + strength indicator bar below (h-1 rounded-full, red/yellow/green based on length)
- Role selector: two cards side by side (grid grid-cols-2 gap-3):
  - "I'm a Client" card: bg-surface border border-border rounded-xl p-4 text-center cursor-pointer. Briefcase icon (lucide) in text-text-secondary. "I need to hire" text-text-muted text-xs mt-1. Selected state: border-accent bg-accent/5, icon text-accent
  - "I'm a Freelancer" card: same but with Code icon. "I want to work" text. Same selected state.
- Submit button: "Create account" with ArrowRight

BOTTOM: "By continuing, you agree to our Terms and Privacy Policy" in text-text-muted text-xs mt-6 text-center. "Terms" and "Privacy Policy" are text-accent hover:underline links.

ANIMATIONS:
- Form panel slides in from right (x:20, opacity 0→1), duration 0.6s
- Form elements stagger in from y:10, 0.05s apart
- Tab switch: AnimatePresence with crossfade
- Button hover: scale-[1.01] transition

---

## PROMPT 2: JOB FEED PAGE

Redesign the `/feed` page to match the GeekBid dark+green design system.

LAYOUT:
- bg-surface min-h-screen
- Navbar at top (already exists)
- Below navbar: full-width header strip + filters + job grid

HEADER STRIP (bg-surface-raised border-b border-border py-6 px-6):
- max-w-7xl mx-auto
- Left: "Job Feed" in font-heading text-2xl font-bold text-text-primary, below: "X open jobs with live pricing" in text-text-secondary text-sm (X = count of jobs)
- Right: "Post a Job" button (bg-accent text-surface font-semibold text-sm px-5 py-2.5 rounded-xl, Plus icon) — only shown if user is client role

FILTER BAR (mt-6, max-w-7xl mx-auto px-6):
- Horizontal scrollable row on mobile, flex on desktop
- Search input: bg-surface border border-border rounded-xl px-4 py-2.5 w-full md:w-80, Search icon (lucide) left, placeholder "Search jobs..." text-text-muted
- Filter pills row (flex gap-2 ml-4, overflow-x-auto):
  - Skill filter dropdown: border border-border rounded-xl px-4 py-2 text-text-secondary text-sm, ChevronDown icon. Opens a popover with checkboxes for skills (React, FastAPI, Kubernetes, etc.)
  - Sort dropdown: "Sort by" with options: Newest, Highest price, Fastest decay, Nearest deadline
  - Active filters show as accent-colored pills (bg-accent/10 text-accent border border-accent/20 rounded-full px-3 py-1 text-xs) with X button to remove

JOB GRID (mt-6, max-w-7xl mx-auto px-6, pb-12):
- Grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
- Each job card: bg-surface-raised border border-border rounded-2xl p-5 hover:border-accent/20 transition-all duration-300 group cursor-pointer

JOB CARD ANATOMY:
- Top row: flex justify-between items-start
  - Left: client avatar circle (w-8 h-8 bg-accent/10 text-accent text-xs font-semibold rounded-full flex items-center justify-center) + client name (text-text-secondary text-xs ml-2)
  - Right: status badge — if "open": bg-accent/10 text-accent border border-accent/20 rounded-full px-2.5 py-0.5 text-[10px] font-medium. If "accepted": same but yellow.
- Title: font-heading text-lg font-semibold text-text-primary mt-3 line-clamp-2 group-hover:text-accent transition-colors
- Skill tags row (mt-3, flex flex-wrap gap-1.5):
  - Each tag: bg-surface border border-border rounded-md px-2 py-0.5 text-text-muted text-[10px]
- Price section (mt-4, bg-surface rounded-xl p-3 border border-border):
  - Top: "Current Price" label in text-text-muted text-[10px] uppercase tracking-wider
  - Price: font-heading text-2xl font-bold text-accent .price-pulse (animate with live decay)
  - Below: flex justify-between — "Floor: $XXX" (text-text-muted text-xs) and "−$XX/hr" decay rate (text-red-400/70 text-xs)
  - Progress bar: h-1 bg-border rounded-full mt-2. Inner fill bg-accent rounded-full, width = percentage of price remaining between starting and floor
- Bottom row (mt-4, flex justify-between items-center):
  - Left: "Est. Xh" with Clock icon (text-text-muted text-xs), "X bids" with MessageSquare icon
  - Right: deadline — "Xh remaining" with Timer icon, text-text-muted text-xs. If < 6h remaining: text-red-400

EMPTY STATE:
- If no jobs match filters: centered content with Inbox icon (text-text-muted, size 48), "No jobs match your filters" heading, "Try broadening your search" subtext, "Clear filters" button

ANIMATIONS:
- Job cards stagger in from y:20, opacity 0→1, 0.05s apart
- Price numbers use CountUp animation on first view
- Cards hover: subtle translateY(-2px) shadow effect

---

## PROMPT 3: JOB DETAIL PAGE

Redesign the `/jobs/[id]` page to match the GeekBid dark+green design system.

LAYOUT:
- bg-surface min-h-screen
- max-w-6xl mx-auto px-6 py-8
- Two-column layout on lg+: left (lg:w-2/3) = job details, right (lg:w-1/3) = bid panel
- Single column on mobile: details on top, bid panel below

LEFT COLUMN — JOB DETAILS:

Back link: "← Back to Feed" in text-text-secondary text-sm hover:text-accent, with ArrowLeft icon

Job header card (mt-4, bg-surface-raised border border-border rounded-2xl p-6 sm:p-8):
- Status badge top-right: "Open" (bg-accent/10 text-accent) or "Accepted" (bg-yellow-500/10 text-yellow-500)
- Title: font-heading text-2xl sm:text-3xl font-bold text-text-primary
- Client info row (mt-3): avatar circle + "Posted by [name]" text-text-secondary text-sm + "X hours ago" with Clock icon
- Skill tags row (mt-4): same as feed card but slightly larger (px-2.5 py-1 text-xs)

Description card (mt-4, bg-surface-raised border border-border rounded-2xl p-6 sm:p-8):
- "Description" label: text-text-muted text-xs uppercase tracking-wider font-semibold
- Description text: text-text-secondary text-sm leading-relaxed mt-3
- Whitespace-pre-wrap to preserve formatting

Price analytics card (mt-4, bg-surface-raised border border-border rounded-2xl p-6):
- "Price Analytics" label with BarChart3 icon (lucide) in text-accent
- Grid of 4 stats (grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4):
  - Starting Price: font-heading text-xl font-bold text-text-primary, label text-text-muted text-xs
  - Current Price: font-heading text-xl font-bold text-accent .price-pulse
  - Floor Price: font-heading text-xl font-bold text-text-primary
  - Decay Rate: font-heading text-xl font-bold text-red-400/70, "-$XX/hr"
- Visual decay progress bar below (mt-4): full-width h-2 bg-border rounded-full, inner fill bg-gradient-to-r from-accent to-accent-dim, width proportional to remaining price

Bids section (mt-4, bg-surface-raised border border-border rounded-2xl p-6):
- "Bids (X)" label with MessageSquare icon
- If no bids: "No bids yet. Be the first!" in text-text-muted text-sm
- Bid list (space-y-3 mt-4):
  - Each bid row: bg-surface rounded-xl p-4 border border-border hover:border-accent/10
    - Left: avatar circle + freelancer name (text-text-primary text-sm font-medium) + GeekScore badge (bg-accent/10 text-accent text-[10px] px-2 py-0.5 rounded-full, "Score: XXX")
    - Center: bid message in text-text-secondary text-xs italic (if counter bid)
    - Right: bid price in font-heading text-lg font-bold text-accent + bid type badge ("Accept" green or "Counter" blue) + time ago

RIGHT COLUMN — BID PANEL:

Sticky panel (lg:sticky lg:top-20):

Live price card (bg-surface-raised border border-border rounded-2xl p-6):
- "Live Price" label with green pulsing dot (w-2 h-2 bg-accent rounded-full animate-pulse)
- Current price: font-heading text-4xl font-bold text-accent .price-pulse (animating with real-time decay)
- "Started at $XXX" in text-text-muted text-xs line-through mt-1
- Time remaining: "Xh Xm remaining" with Timer icon, text-text-secondary text-sm mt-2
- Deadline: "Closes [date]" text-text-muted text-xs

Action buttons (mt-4, space-y-3):
- If user is freelancer and job is open:
  - "Accept at $XXX" — full-width bg-accent text-surface font-semibold py-3 rounded-xl .glow-green hover:bg-accent-dim
  - Divider with "or"
  - Counter-bid section:
    - Price input: bg-surface border border-border rounded-xl, with "$" prefix, font-heading text-lg
    - Message textarea: bg-surface border border-border rounded-xl, placeholder "Why should the client pick you?" text-sm
    - "Submit Counter-Bid" — full-width border border-accent text-accent font-semibold py-3 rounded-xl hover:bg-accent/5
    - Validation: price must be ≤ current price and ≥ floor price. Show error in text-red-400 text-xs
- If user is client (job owner):
  - Job stats summary
  - "Edit Job" and "Delete Job" buttons (secondary style)
- If job is accepted:
  - "Accepted" status with check icon, final price, and freelancer info

Job details sidebar (mt-4, bg-surface-raised border border-border rounded-2xl p-6):
- Grid of info rows (space-y-3):
  - "Estimated Hours" — Clock icon + value
  - "Posted" — Calendar icon + date
  - "Deadline" — Timer icon + date
  - "Visibility" — Eye icon + "Public"/"Invite Only"
  - "Platform Fee" — "10%" in text-text-muted

ANIMATIONS:
- Left column fades in from x:-10
- Right panel fades in from x:10, delay 0.2s
- Price number uses CountUp
- Bid rows stagger in from y:10

---

## PROMPT 4: POST JOB PAGE

Redesign the `/post-job` page to match the GeekBid dark+green design system.

LAYOUT:
- bg-surface min-h-screen
- max-w-3xl mx-auto px-6 py-8

HEADER:
- Back link: "← Back to Feed" text-text-secondary text-sm hover:text-accent
- Title: "Post a New Job" font-heading text-2xl sm:text-3xl font-bold text-text-primary mt-4
- Subtitle: "Set your starting price and let the market find the true value." text-text-secondary text-sm mt-1

FORM (mt-8, bg-surface-raised border border-border rounded-2xl p-6 sm:p-8):

Section 1 — "Project Details" (text-accent text-xs uppercase tracking-wider font-semibold):
- Title input: label "Job Title *", placeholder "e.g. Build AI chatbot for customer support", standard input style
- Description textarea: label "Description *", 6 rows, placeholder "Describe the scope, deliverables, and requirements..."
- Skills selector: label "Required Skills", multi-select with tag chips. Typing filters from a preset list. Selected skills show as bg-accent/10 text-accent border border-accent/20 rounded-full px-3 py-1 text-xs with X remove button. Available: React, FastAPI, Node.js, TypeScript, Kubernetes, AWS, Smart Contracts, etc.
- Estimated hours input: label "Estimated Hours", number input with Clock icon

Section divider: h-px bg-border my-6

Section 2 — "Pricing" (text-accent text-xs uppercase tracking-wider font-semibold):
- Starting price input: label "Starting Price ($) *", number input with DollarSign icon (lucide). Helper: "The price your job starts at" text-text-muted text-xs
- Floor price input: label "Minimum Price ($) *", number input. Helper: "Price will never drop below this"
- Decay rate input: label "Decay Rate ($/hour)", number input with TrendingDown icon. Helper: "How fast the price decreases"
- Live preview box (bg-surface rounded-xl p-4 border border-border mt-4):
  - "Price Preview" label with Eye icon
  - Shows a mini timeline: starting price → current (with decay applied) → floor
  - Visual: horizontal line with 3 dots at start/current/floor positions, text-accent line fill
  - "At this rate, price will hit floor in Xh" calculated dynamically

Section divider: h-px bg-border my-6

Section 3 — "Timeline" (text-accent text-xs uppercase tracking-wider font-semibold):
- Deadline date/time picker: label "Deadline", bg-surface border border-border rounded-xl, Calendar icon
- Visibility toggle: "Public" (anyone can see) vs "Invite Only" — two radio cards similar to role selector in login

SUBMIT SECTION (mt-8, flex justify-between items-center):
- Left: "Save as Draft" secondary button
- Right: "Post Job →" primary button (bg-accent text-surface .glow-green), disabled state if required fields empty (opacity-50 cursor-not-allowed)
- Validation errors show below each field in text-red-400 text-xs with AlertCircle icon

ANIMATIONS:
- Form sections stagger in from y:20, 0.1s apart
- Price preview animates on value change
- Submit button: hover scale-[1.01]

---

## PROMPT 5: MY JOBS PAGE

Redesign the `/my-jobs` page to match the GeekBid dark+green design system.

LAYOUT:
- bg-surface min-h-screen
- max-w-6xl mx-auto px-6 py-8

HEADER:
- Title: "My Jobs" font-heading text-2xl sm:text-3xl font-bold text-text-primary
- Subtitle: depends on role — Client: "Jobs you've posted" / Freelancer: "Jobs you've accepted or bid on"

TAB SWITCHER (mt-6):
- For clients: "Posted (X)" | "Completed (X)"
- For freelancers: "Active (X)" | "My Bids (X)" | "Completed (X)"
- Tab bar: inline-flex bg-surface-raised rounded-xl p-1 border border-border
- Active: bg-accent text-surface font-medium text-sm px-5 py-2 rounded-lg
- Inactive: text-text-secondary text-sm px-5 py-2

JOB LIST (mt-6, space-y-3):
Each job row: bg-surface-raised border border-border rounded-2xl p-5 hover:border-accent/20 transition-all flex items-center justify-between gap-4

Row anatomy:
- Left section (flex-1):
  - Title: text-text-primary font-medium text-base
  - Below: flex items-center gap-4 text-text-muted text-xs mt-1
    - Posted date with Calendar icon
    - Number of bids with MessageSquare icon
    - If accepted: "Accepted by [name]" with CheckCircle icon in text-accent
- Center: Current/final price in font-heading text-xl font-bold text-accent
- Right: status badge + action button
  - Open: green badge + "View" button (secondary)
  - Accepted: yellow badge + "Chat" button (secondary) + "Release Escrow" button (primary, for client)
  - Completed: gray badge + "View" button

EMPTY STATE per tab:
- Active/Posted: Briefcase icon + "No active jobs" + "Post your first job" CTA (clients) or "Browse the feed" CTA (freelancers)

ANIMATIONS:
- Job rows stagger in from y:10, 0.05s apart
- Tab switch: AnimatePresence with slide

---

## PROMPT 6: INBOX / CHAT PAGE

Redesign the `/inbox` page to match the GeekBid dark+green design system.

LAYOUT:
- bg-surface min-h-screen, flex (sidebar + chat area)
- On mobile: show either room list OR chat, with back button to switch

LEFT SIDEBAR — Room List (w-80 lg:w-96 border-r border-border bg-surface-raised h-[calc(100vh-64px)] overflow-y-auto):

Header: "Messages" font-heading text-xl font-bold text-text-primary p-4 border-b border-border

Room list (divide-y divide-border):
Each room row: px-4 py-3 hover:bg-surface-elevated cursor-pointer transition-colors. Active room: bg-surface-elevated border-l-2 border-accent

Row anatomy:
- Top: flex justify-between — job title (text-text-primary text-sm font-medium truncate) + time ago (text-text-muted text-[10px])
- Bottom: last message preview (text-text-secondary text-xs truncate mt-0.5) + unread dot (w-2 h-2 bg-accent rounded-full) if unread

Empty state: MessageCircle icon + "No conversations yet" + "Start chatting by accepting a job"

RIGHT PANEL — Chat Area (flex-1 flex flex-col h-[calc(100vh-64px)]):

Chat header (px-6 py-4 border-b border-border bg-surface-raised flex items-center justify-between):
- Left: job title (font-heading text-lg font-semibold text-text-primary) + participant names (text-text-secondary text-xs)
- Right: "View Job" link (text-accent text-sm hover:underline)

Messages area (flex-1 overflow-y-auto px-6 py-4 space-y-4):
Each message:
- If sent by current user (right-aligned):
  - bg-accent text-surface rounded-2xl rounded-br-md px-4 py-2.5 max-w-[70%] ml-auto
  - Time below: text-text-muted text-[10px] text-right mt-0.5
- If received (left-aligned):
  - bg-surface-raised border border-border rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[70%]
  - Sender name above: text-accent text-[10px] font-medium mb-0.5
  - Time below: text-text-muted text-[10px] mt-0.5

Message input bar (px-6 py-4 border-t border-border bg-surface-raised):
- flex items-center gap-3
- Input: flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder "Type a message..." focus:border-accent/50
- Send button: w-10 h-10 bg-accent rounded-xl flex items-center justify-center hover:bg-accent-dim. Send icon (lucide) text-surface size 18

ANIMATIONS:
- Messages slide in from y:10 with opacity fade
- Room list items fade in staggered
- Sent messages: slide from right

---

## PROMPT 7: PAYMENTS PAGE

Redesign the `/payments` page to match the GeekBid dark+green design system.

LAYOUT:
- bg-surface min-h-screen
- max-w-6xl mx-auto px-6 py-8

HEADER:
- Title: "Payments" font-heading text-2xl sm:text-3xl font-bold text-text-primary
- Subtitle: "Manage escrow, transactions, and payment methods" text-text-secondary text-sm

STATS ROW (mt-6, grid grid-cols-1 sm:grid-cols-3 gap-4):
Each stat card: bg-surface-raised border border-border rounded-2xl p-5
- Label: text-text-muted text-xs uppercase tracking-wider
- Value: font-heading text-2xl font-bold mt-1
- Card 1: "Total Spent/Earned" — value in text-text-primary
- Card 2: "In Escrow" — value in text-yellow-500
- Card 3: "Available" — value in text-accent

MAKE PAYMENT SECTION (for clients, mt-8):
- Card: bg-surface-raised border border-border rounded-2xl p-6
- "Fund Escrow" heading with CreditCard icon in text-accent
- Amount input with DollarSign icon
- Job selector dropdown
- "Pay with Razorpay" button (bg-accent text-surface .glow-green) — opens Razorpay checkout
- Mock mode indicator: if mock, show a small pill "Test Mode" in bg-yellow-500/10 text-yellow-500

TRANSACTION TABLE (mt-8):
Header: "Transaction History" font-heading text-lg font-semibold text-text-primary + filter pills (All, Held, Released, Disputed)

Table: bg-surface-raised border border-border rounded-2xl overflow-hidden
- Table header row: bg-surface text-text-muted text-xs uppercase tracking-wider
- Columns: Job | Amount | Fee | Net | Status | Date | Action
- Each row: border-b border-border hover:bg-surface-elevated py-4 px-6
  - Job: text-text-primary text-sm font-medium
  - Amount: font-heading text-sm text-text-primary
  - Fee: text-text-muted text-sm
  - Net: text-accent text-sm font-medium
  - Status: pill badges:
    - held: bg-yellow-500/10 text-yellow-500 border border-yellow-500/20
    - released: bg-accent/10 text-accent border border-accent/20
    - disputed: bg-red-500/10 text-red-400 border border-red-500/20
  - Date: text-text-muted text-xs
  - Action: "Release" button (text-accent text-xs hover:underline) for held, "View" for others
- On "Release" click: confirmation dialog (bg-surface-raised rounded-2xl border border-border p-6, "Are you sure?" heading, amount shown, confirm/cancel buttons)

ANIMATIONS:
- Stats cards fade in staggered
- Table rows slide in from y:10

---

## PROMPT 8: EARNINGS PAGE

Redesign the `/earnings` page to match the GeekBid dark+green design system.

LAYOUT:
- bg-surface min-h-screen
- max-w-6xl mx-auto px-6 py-8

HEADER:
- Title: "Earnings" font-heading text-2xl sm:text-3xl font-bold text-text-primary
- Subtitle: "Track your freelance income and payouts" text-text-secondary text-sm

EARNINGS OVERVIEW (mt-6, grid grid-cols-1 sm:grid-cols-4 gap-4):
- Card 1: "Total Earned" — large number in text-accent, font-heading text-3xl, with TrendingUp icon
- Card 2: "This Month" — text-text-primary
- Card 3: "Pending" — text-yellow-500
- Card 4: "Avg. Job Value" — text-text-primary

EARNINGS CHART (mt-8, bg-surface-raised border border-border rounded-2xl p-6):
- "Monthly Earnings" heading
- Simple horizontal bar chart (last 6 months), bars in bg-accent with rounded ends, labels in text-text-muted
- Or: a mini line chart mockup using CSS/divs with gradient fill below the line (bg-gradient-to-b from-accent/20 to-transparent)

JOB EARNINGS LIST (mt-8):
- "Completed Jobs" heading
- Each row: bg-surface-raised border border-border rounded-xl p-4 mb-3
  - Job title, client name, date completed
  - Gross amount, platform fee (10%), net earned in text-accent font-heading font-bold
  - "View Details" link text-accent text-xs

ANIMATIONS:
- Numbers use CountUp animation
- Chart bars animate width from 0 to target
- Cards stagger in

---

## PROMPT 9: NOTIFICATIONS PAGE

Redesign the `/notifications` page to match the GeekBid dark+green design system.

LAYOUT:
- bg-surface min-h-screen
- max-w-3xl mx-auto px-6 py-8

HEADER:
- flex justify-between items-center
- Left: "Notifications" font-heading text-2xl font-bold text-text-primary + unread count badge (bg-accent text-surface text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ml-2)
- Right: "Mark all read" button (text-accent text-sm hover:underline, CheckCheck icon from lucide)

FILTER TABS (mt-4):
- Horizontal pills: "All" | "Price Drops" | "Bids" | "Payments" | "Matches"
- Active: bg-accent/10 text-accent border border-accent/20 rounded-full px-4 py-1.5 text-sm
- Inactive: text-text-secondary text-sm px-4 py-1.5 hover:text-text-primary

NOTIFICATION LIST (mt-6, space-y-2):
Each notification: bg-surface-raised border border-border rounded-xl p-4 flex items-start gap-4 hover:border-accent/10 cursor-pointer transition-all

If unread: border-l-2 border-accent bg-surface-elevated/30

Left: icon circle (w-10 h-10 rounded-xl flex items-center justify-center)
- price_drop: bg-red-500/10, TrendingDown icon text-red-400
- counter_bid: bg-blue-500/10, MessageSquare icon text-blue-400
- payment: bg-accent/10, DollarSign icon text-accent
- job_match: bg-purple-500/10, Zap icon text-purple-400
- general: bg-surface, Bell icon text-text-muted

Center (flex-1):
- Title: text-text-primary text-sm font-medium
- Body: text-text-secondary text-xs mt-0.5 line-clamp-2
- Time: text-text-muted text-[10px] mt-1, with Clock icon

Right: if unread, green dot (w-2 h-2 bg-accent rounded-full)

EMPTY STATE: Bell icon (text-text-muted size 48) + "You're all caught up!" + "We'll notify you when something happens"

ANIMATIONS:
- Notifications slide in from y:10, staggered 0.03s
- Mark as read: notification fades from elevated to normal
- "Mark all read": all unread dots fade out simultaneously

---

## PROMPT 10: PROFILE PAGE

Redesign the `/profile` page to match the GeekBid dark+green design system.

LAYOUT:
- bg-surface min-h-screen
- max-w-4xl mx-auto px-6 py-8

PROFILE HEADER CARD (bg-surface-raised border border-border rounded-2xl p-6 sm:p-8):
- flex items-start gap-6 (stack on mobile: flex-col items-center text-center)
- Avatar: w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-accent/10 flex items-center justify-center text-accent font-heading text-3xl font-bold (shows initials)
- Right side:
  - Name: font-heading text-2xl font-bold text-text-primary
  - Email: text-text-secondary text-sm mt-0.5
  - Role badge: bg-accent/10 text-accent border border-accent/20 rounded-full px-3 py-1 text-xs font-medium mt-2 (e.g. "Freelancer" or "Client")
  - If freelancer: GeekScore display — font-heading text-lg font-bold text-accent + "GeekScore™" label text-text-muted text-xs
  - Verified badge: if verified, CheckCircle icon text-accent + "Verified" text-accent text-xs

EDIT PROFILE FORM (mt-6, bg-surface-raised border border-border rounded-2xl p-6 sm:p-8):
- "Edit Profile" heading with Pencil icon in text-accent

Section 1 — "Personal Info":
- Full name input (prefilled)
- Bio textarea (3 rows, prefilled), label "Bio"
- Company input (clients only)

Section 2 — "Professional" (freelancers only):
- Skills multi-select (same as post-job skill selector, prefilled)
- Hourly rate range: two inputs side by side — "Min Rate ($/hr)" and "Max Rate ($/hr)"
- Availability selector: 3 radio cards — "Available" (green dot), "Part-time" (yellow dot), "Unavailable" (red dot). Selected: border-accent bg-accent/5
- GitHub username input with GitHub icon

Section 3 — "Account":
- "Change Password" collapsible section (click to expand)
- "Delete Account" — red danger zone at bottom: bg-red-500/5 border border-red-500/20 rounded-xl p-4, "This action is irreversible" warning, "Delete Account" button in bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20

SAVE BUTTON (mt-6): "Save Changes" bg-accent text-surface font-semibold py-3 px-8 rounded-xl .glow-green, disabled if no changes

ANIMATIONS:
- Form sections stagger in
- Save button: success state shows checkmark animation (morphs from text to CheckCircle icon for 2 seconds)

---

## PROMPT 11: ADMIN DASHBOARD PAGE

Redesign the `/admin` page to match the GeekBid dark+green design system. Admin-only page.

LAYOUT:
- bg-surface min-h-screen
- max-w-7xl mx-auto px-6 py-8

HEADER:
- "Admin Dashboard" font-heading text-2xl sm:text-3xl font-bold text-text-primary with Shield icon in text-accent
- "Platform overview and dispute management" text-text-secondary text-sm

STATS ROW (mt-6, grid grid-cols-2 sm:grid-cols-4 gap-4):
Each card: bg-surface-raised border border-border rounded-2xl p-5
- Card 1: "Total Users" — Users icon, count in font-heading text-2xl font-bold text-text-primary
- Card 2: "Open Jobs" — Briefcase icon, count in text-accent
- Card 3: "Active Disputes" — AlertTriangle icon, count in text-red-400 (highlighted if > 0)
- Card 4: "Revenue (Fees)" — DollarSign icon, total platform fees in text-accent

TAB SECTIONS (mt-8):
Tabs: "Disputes (X)" | "Users (X)" | "Jobs (X)" | "Transactions (X)"
- Tab bar same as my-jobs

DISPUTES TAB (default):
- "Open Disputes" heading
- Each dispute card: bg-surface-raised border border-border rounded-2xl p-5 mb-3
  - Top: flex justify-between — "Dispute #[id]" font-heading text-sm font-semibold text-text-primary + status badge (open: red, in_review: yellow, resolved: green)
  - Raised by: avatar + name + "on [date]" text-text-muted text-xs
  - Reason: text-text-secondary text-sm mt-2, italic
  - Transaction details: "Job: [title] | Amount: $XXX | Escrow: [status]" in text-text-muted text-xs mt-2 bg-surface rounded-lg p-3
  - Action buttons (mt-3): "Resolve" (bg-accent text-surface text-sm px-4 py-2 rounded-lg) opens a dialog with:
    - Status selector: "Resolved" / "Refunded" / "Dismissed"
    - Resolution text textarea
    - "Confirm Resolution" button

USERS TAB:
- Table: columns — Name | Email | Role | GeekScore | Verified | Joined | Actions
- Role filters: "All" | "Clients" | "Freelancers" | "Admins"
- Each row clickable, hover:bg-surface-elevated
- Action: "View" link text-accent

JOBS TAB:
- Table: columns — Title | Client | Status | Price | Bids | Posted | Actions
- Status filters: "All" | "Open" | "Accepted" | "Completed"

TRANSACTIONS TAB:
- Same table as Payments page but showing ALL transactions (admin view)

ANIMATIONS:
- Stats use CountUp on first view
- Table rows stagger in
- Tab switch: AnimatePresence slide

---

## HOW TO USE THESE PROMPTS

1. **First**: Build the landing page using `docs/LANDING_PAGE_PROMPT.md`
2. **Then**: Paste the SHARED DESIGN SYSTEM block (at the top of this file) before each screen prompt
3. **One at a time**: Give Claude Code one prompt per screen to redesign
4. **Order**: Login → Feed → Job Detail → Post Job → My Jobs → Inbox → Payments → Earnings → Notifications → Profile → Admin

Each prompt assumes the design system (colors, fonts, Tailwind config, CSS utilities) is already set up from the landing page build.

---

*End of Screen Prompts*
