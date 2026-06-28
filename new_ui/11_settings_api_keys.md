# 11 — Settings & API Keys

> **Design Component:** `settings_api_terminal` (implied)  
> **Target File:** `web/src/app/settings/page.tsx` (171 lines)

---

## Current Production State

A compact settings page (171 lines) focused on **API Key Management**:
- **Back link** — Arrow + "Back to Dashboard"
- **Create key** — Name input + Generate button
- **New key display** — Copy-to-clipboard with warning banner
- **Key list** — Table showing key prefix, name, creation date, last used, revoke button
- Uses `lucide-react` icons: Key, Plus, Trash2, Copy, AlertTriangle, Clock, Code2

## Design System Upgrade

### Settings Terminal

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Container | `bg-[#0A0A0F]` | Grid background |
| Key Card | `bg-[#12121A]` bordered | Glass-panel with emerald accent |
| Input | Standard input | Glass input with emerald focus |
| Generate Button | Standard button | Neon glass CTA |
| Key Display | Warning card | Terminal-style monospace display with copy animation |
| Key Table | Simple list | Glass-panel table with hover row glow |
| Revoke Button | Red icon button | Confirmed destructive action with hover glow |

### Key CSS Additions

```css
/* Settings Terminal */
.settings-key-display {
    background: rgba(10, 10, 15, 0.8);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 12px;
    font-family: 'JetBrains Mono', monospace;
    padding: 16px;
    color: #00ff88;
}

/* Copy Animation */
@keyframes copyFlash {
    0% { background: rgba(0, 255, 136, 0.2); }
    100% { background: transparent; }
}
.copy-flash {
    animation: copyFlash 0.5s ease-out;
}
```

---

## Implementation Checklist

- [ ] Upgrade container to glass-panel
- [ ] Add terminal-style key display
- [ ] Upgrade inputs to glass-styled
- [ ] Add copy animation feedback
- [ ] Upgrade key table to glass-panel with hover glow
- [ ] Add confirmation dialog for key revocation

## API Dependencies

| Endpoint | Usage |
|----------|-------|
| `GET /api/keys` | List user's API keys |
| `POST /api/keys` | Generate new API key |
| `DELETE /api/keys?id=` | Revoke API key |

## File Changes Required

| File | Action |
|------|--------|
| `web/src/app/settings/page.tsx` | Glass-panel visual upgrade |
| `web/src/app/globals.css` | Add `.settings-key-display`, `.copy-flash` |
