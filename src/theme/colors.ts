import { useColorScheme } from 'react-native';

export type AppThemeColors = {
  mode: 'light' | 'dark';
  primary: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSoft: string;
  success: string;
  danger: string;
  warning: string;
  buttonPrimaryText: string;
};

const lightTheme: AppThemeColors = {
  mode: 'light',
  primary: '#2d69a6',
  background: '#f3f7fc',
  surface: '#ffffff',
  surfaceMuted: '#f6fbff',
  border: '#d9e9f8',
  borderStrong: '#c7dff5',
  text: '#1f2d3d',
  textMuted: '#5d6f82',
  textSoft: '#7b8fa3',
  success: '#166534',
  danger: '#b91c1c',
  warning: '#92400e',
  buttonPrimaryText: '#ffffff',
};

const darkTheme: AppThemeColors = {
  mode: 'dark',
  primary: '#77b4f2',
  background: '#0f1722',
  surface: '#162130',
  surfaceMuted: '#1b2a3b',
  border: '#2a3a4f',
  borderStrong: '#3a4f67',
  text: '#e9f1fb',
  textMuted: '#b7c7da',
  textSoft: '#93a8c0',
  success: '#4ade80',
  danger: '#f87171',
  warning: '#fbbf24',
  buttonPrimaryText: '#0b1726',
};

export function useAppTheme(): AppThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}
