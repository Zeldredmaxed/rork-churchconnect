const darkColors = {
  background: '#1A1A1A',
  surface: '#222222',
  surfaceElevated: '#2C2C2C',
  surfaceHover: '#333333',
  border: '#3A3A3A',
  borderLight: '#2E2E2E',

  text: '#F2F2F2',
  textSecondary: '#A0A0A0',
  textTertiary: '#6E6E6E',
  textInverse: '#1A1A1A',

  accent: '#D4A574',
  accentLight: '#E8C899',
  accentDark: '#B8895A',
  accentMuted: 'rgba(212, 165, 116, 0.15)',

  success: '#34D399',
  successMuted: 'rgba(52, 211, 153, 0.15)',
  error: '#F87171',
  errorMuted: 'rgba(248, 113, 113, 0.15)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251, 191, 36, 0.15)',
  info: '#60A5FA',
  infoMuted: 'rgba(96, 165, 250, 0.15)',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',

  tabBar: '#1A1A1A',
  tabBarBorder: '#2E2E2E',
  tabBarActive: '#D4A574',
  tabBarInactive: '#6E6E6E',
} as const;

const lightColors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#F2F2F7',
  surfaceHover: '#E5E5EA',
  border: '#D1D1D6',
  borderLight: '#E5E5EA',

  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#8E8E93',
  textInverse: '#FFFFFF',

  accent: '#D4A574',
  accentLight: '#E8C899',
  accentDark: '#B8895A',
  accentMuted: 'rgba(212, 165, 116, 0.12)',

  success: '#34C759',
  successMuted: 'rgba(52, 199, 89, 0.12)',
  error: '#FF3B30',
  errorMuted: 'rgba(255, 59, 48, 0.12)',
  warning: '#FF9500',
  warningMuted: 'rgba(255, 149, 0, 0.12)',
  info: '#007AFF',
  infoMuted: 'rgba(0, 122, 255, 0.12)',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.4)',

  tabBar: '#FFFFFF',
  tabBarBorder: '#D1D1D6',
  tabBarActive: '#D4A574',
  tabBarInactive: '#8E8E93',
} as const;

const shared = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 999,
  },
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
} as const;

export const darkTheme = { colors: darkColors, ...shared } as const;
export const lightTheme = { colors: lightColors, ...shared } as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceHover: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  accentMuted: string;
  success: string;
  successMuted: string;
  error: string;
  errorMuted: string;
  warning: string;
  warningMuted: string;
  info: string;
  infoMuted: string;
  white: string;
  black: string;
  overlay: string;
  tabBar: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export interface AppTheme {
  colors: ThemeColors;
  spacing: typeof shared.spacing;
  radius: typeof shared.radius;
  fontSize: typeof shared.fontSize;
}

export const theme = darkTheme;
