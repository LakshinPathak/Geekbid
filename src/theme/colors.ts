export const colors = {
  // Background layers
  bg: '#090D1A',
  bgSecondary: '#0E1424',
  card: '#131B2E',
  cardElevated: '#1D2842',

  // Text
  text: '#F8FAFC',
  textSecondary: '#E2E8F0',
  muted: '#94A3B8',
  placeholder: '#475569',

  // Primary accent
  accent: '#10B981',
  accentDim: '#064E3B',
  accentGlow: 'rgba(16, 185, 129, 0.15)',

  // Secondary accent
  accentBlue: '#3B82F6',
  accentBlueDim: '#1E3A8A',
  accentBlueGlow: 'rgba(59, 130, 246, 0.12)',

  // Status
  danger: '#EF4444',
  dangerDim: '#7F1D1D',
  warning: '#F59E0B',
  warningDim: '#78350F',
  info: '#0EA5E9',

  // Borders & overlays
  border: '#1E293B',
  borderLight: '#334155',
  overlay: 'rgba(0,0,0,0.65)',
  glass: 'rgba(15, 23, 42, 0.85)',

  // Badge / chip
  badge: '#1E293B',
  badgeText: '#CBD5E1',

  // Geek Score tier colors
  tierNewbie: '#64748B',
  tierScriptKiddie: '#10B981',
  tierCodeMonkey: '#3B82F6',
  tierSeniorGeek: '#8B5CF6',
  tierElite: '#F59E0B',

  // Gradients (as arrays for LinearGradient)
  gradientHero: ['#1E293B', '#0F172A', '#090D1A'] as const,
  gradientAccent: ['#059669', '#10B981'] as const,
  gradientBlue: ['#2563EB', '#3B82F6'] as const,
  gradientCard: ['#1E293B', '#0F172A'] as const,
  gradientPurple: ['#6D28D9', '#8B5CF6'] as const,
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
