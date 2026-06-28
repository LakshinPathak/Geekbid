# 06 — Auth Pages (Login + Signup)

> **Design Components:** `geekbid_signup_screen` + `geekbid_login_screen`  
> **Target File:** `web/src/app/login/page.tsx` (332 lines)

---

## Current Production State

The login page (332 lines) handles both **Login** and **Signup** modes via a toggle:
- **Tab switcher** — Login / Sign Up tabs
- **Login form** — Email + Password + "Sign in with Google" (simulated OAuth)
- **Signup form** — Full Name, Email, Password, Confirm Password, Role select (Freelancer/Client), GitHub username
- **Visual** — Split layout with left panel (feature list + gradient) + right panel (form)
- **Features** — Uses `toast()` for notifications, form validation, auto-redirect on login

## Design System Upgrade

### Signup Screen

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Background | `bg-[#0A0A0F]` flat | Animated grid background + shader canvas |
| Left Panel | Gradient card + feature list | Full glass-panel with large product screenshot |
| Form Container | `bg-[#12121A]` bordered | Glass-panel with `backdrop-filter: blur(24px)` |
| Input Fields | `bg-[#0A0A0F] border-[#1E1E2A]` | Glass inputs with emerald focus glow |
| CTA Button | `bg-[#00FF88]` solid | Neon glass button with shadow glow |
| Social Auth | `bg-[#12121A]` bordered button | Glass button with Google/GitHub brand icons |
| Role Select | Radio buttons | Segmented control with emerald active indicator |
| Step Indicator | None | Multi-step progress bar (if multi-step signup) |

### Login Screen

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Layout | Split panel | Centered card with subtle background animation |
| Form | Same as signup | Simplified glass-panel with email/password only |
| "Forgot Password" | Not present | Add with emerald link color |
| Social Login | Google button | Google + GitHub glass buttons |
| Branding | Logo text | Animated logo with glow effect |

### Key CSS Additions

```css
/* Auth Glass Container */
.auth-container {
    background: rgba(31, 31, 37, 0.5);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(59, 75, 61, 0.3);
    border-radius: 24px;
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.3);
}

/* Auth Input */
.auth-input {
    background: rgba(10, 10, 15, 0.6);
    border: 1px solid rgba(59, 75, 61, 0.3);
    border-radius: 12px;
    color: #e8e8ec;
    transition: border-color 0.3s, box-shadow 0.3s;
}
.auth-input:focus {
    border-color: rgba(0, 255, 136, 0.5);
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.15);
}

/* Segmented Role Selector */
.role-selector {
    display: flex;
    background: rgba(10, 10, 15, 0.6);
    border-radius: 12px;
    padding: 4px;
    border: 1px solid rgba(59, 75, 61, 0.3);
}
.role-option {
    flex: 1;
    padding: 10px 16px;
    border-radius: 8px;
    text-align: center;
    transition: all 0.3s ease;
    cursor: pointer;
}
.role-option.active {
    background: rgba(0, 255, 136, 0.15);
    color: #00ff88;
    border: 1px solid rgba(0, 255, 136, 0.3);
}
```

### Email Integration Point

Login/Signup triggers email via the Resend API:
- **Signup Success** → Welcome email to `lakshin2563@gmail.com`
- **First Login** → "Getting Started" guide email
- Uses `from: "onboarding@resend.dev"` (sandbox mode)

---

## Implementation Checklist

- [ ] Upgrade form container to glass-panel
- [ ] Add grid background animation
- [ ] Replace inputs with glass-styled variants
- [ ] Implement segmented role selector
- [ ] Upgrade CTA buttons to neon glass style
- [ ] Add animated logo/branding to login header
- [ ] Add "Forgot Password" link
- [ ] Integrate welcome email trigger on signup success
- [ ] Add subtle form transition animation between Login ↔ Signup

## API Dependencies

| Endpoint | Usage |
|----------|-------|
| `POST /api/auth/register` | User registration |
| `POST /api/auth/login` | User authentication |
| `POST /api/email/send` | Welcome email on signup |
| `POST /api/auth/google` | Google OAuth flow |

## File Changes Required

| File | Action |
|------|--------|
| `web/src/app/login/page.tsx` | Major visual overhaul + email integration |
| `web/src/app/globals.css` | Add `.auth-container`, `.auth-input`, `.role-selector` |
