export type AppTheme = {
  readonly colors: {
    readonly primary: string;
    readonly primaryDark: string;
    readonly primaryLight: string;
    readonly secondary: string;
    readonly secondaryLight: string;
    readonly accent: string;
    readonly success: string;
    readonly warning: string;
    readonly error: string;
    readonly info: string;
    readonly background: string;
    readonly surface: string;
    readonly surfaceMuted: string;
    readonly textPrimary: string;
    readonly textSecondary: string;
    readonly border: string;
  };
  readonly fonts: {
    readonly headingSemiBold: string;
    readonly headingBold: string;
    readonly bodyRegular: string;
    readonly bodyMedium: string;
    readonly bodySemiBold: string;
  };
  readonly radii: {
    readonly sm: number;
    readonly md: number;
    readonly lg: number;
  };
  readonly spacing: {
    readonly xs: number;
    readonly sm: number;
    readonly md: number;
    readonly lg: number;
    readonly xl: number;
  };
};

const shared = {
  fonts: {
    headingSemiBold: 'Poppins_600SemiBold',
    headingBold: 'Poppins_700Bold',
    bodyRegular: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemiBold: 'Inter_600SemiBold',
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
} as const;

export const lightTheme: AppTheme = {
  ...shared,
  colors: {
    primary: '#0E7C7B',
    primaryDark: '#095E5D',
    primaryLight: '#63C7C3',
    secondary: '#241F3A',
    secondaryLight: '#443B68',
    accent: '#F2C94C',
    success: '#2E7D32',
    warning: '#B7791F',
    error: '#C62828',
    info: '#1976D2',
    background: '#F6F8F6',
    surface: '#FFFFFF',
    surfaceMuted: '#EDF7F5',
    textPrimary: '#15171A',
    textSecondary: '#525A61',
    border: 'rgba(14, 124, 123, 0.16)',
  },
};

export const darkTheme: AppTheme = {
  ...shared,
  colors: {
    primary: '#58D3CE',
    primaryDark: '#0E7C7B',
    primaryLight: '#A5EAE6',
    secondary: '#F2C94C',
    secondaryLight: '#F8E99B',
    accent: '#F2C94C',
    success: '#66BB6A',
    warning: '#D6A23A',
    error: '#EF5350',
    info: '#42A5F5',
    background: '#0E141B',
    surface: '#16212A',
    surfaceMuted: '#102A2B',
    textPrimary: '#F7FBF9',
    textSecondary: '#B8C7C3',
    border: 'rgba(165, 234, 230, 0.18)',
  },
};
