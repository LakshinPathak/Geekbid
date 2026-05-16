export const colors = {
  // Background layers
  bg: '#080E1E',
  bgSecondary: '#0D1529',
  card: '#121C33',
  cardElevated: '#182642',

  // Text
  text: '#F1F5FD',
  textSecondary: '#C5D0E6',
  muted: '#7B8DB5',
  placeholder: '#556585',

  // Primary accent
  accent: '#32D583',
  accentDim: '#1B7A4B',
  accentGlow: 'rgba(50, 213, 131, 0.15)',

  // Secondary accent
  accentBlue: '#3B82F6',
  accentBlueDim: '#1E4DB0',
  accentBlueGlow: 'rgba(59, 130, 246, 0.12)',

  // Status
  danger: '#F87171',
  dangerDim: '#991B1B',
  warning: '#FBBF24',
  warningDim: '#92400E',
  info: '#38BDF8',

  // Borders & overlays
  border: '#1F2F4E',
  borderLight: '#2A3E66',
  overlay: 'rgba(0,0,0,0.55)',
  glass: 'rgba(18, 28, 51, 0.85)',

  // Badge / chip
  badge: '#1A2744',
  badgeText: '#AEBFDB',

  // Geek Score tier colors
  tierNewbie: '#6B7280',
  tierScriptKiddie: '#34D399',
  tierCodeMonkey: '#60A5FA',
  tierSeniorGeek: '#A78BFA',
  tierElite: '#F59E0B',

  // Gradients (as arrays for LinearGradient)
  gradientHero: ['#0F1B3D', '#162B5E', '#080E1E'] as const,
  gradientAccent: ['#1A7A4D', '#32D583'] as const,
  gradientBlue: ['#1E3A8A', '#3B82F6'] as const,
  gradientCard: ['#121C33', '#0F1729'] as const,
  gradientPurple: ['#4C1D95', '#7C3AED'] as const,
};

export const GEEK_TIERS = [
  { min: 0, max: 199, label: 'Newbie', color: colors.tierNewbie, icon: '🔰' },
  { min: 200, max: 399, label: 'Script Kiddie', color: colors.tierScriptKiddie, icon: '🐣' },
  { min: 400, max: 599, label: 'Code Monkey', color: colors.tierCodeMonkey, icon: '🐒' },
  { min: 600, max: 799, label: 'Senior Geek', color: colors.tierSeniorGeek, icon: '🧠' },
  { min: 800, max: 1000, label: '10x Engineer', color: colors.tierElite, icon: '⚡' },
] as const;

export const getGeekTier = (score: number) =>
  GEEK_TIERS.find((t) => score >= t.min && score <= t.max) ?? GEEK_TIERS[0];
