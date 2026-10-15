import { createContext, useContext } from 'react';
import type { AppTheme } from './tokens';
import { lightTheme } from './tokens';

export const ThemeContext = createContext<AppTheme>(lightTheme);

export function useAppTheme(): AppTheme {
  return useContext(ThemeContext);
}
