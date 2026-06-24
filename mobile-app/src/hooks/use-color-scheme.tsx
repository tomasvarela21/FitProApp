import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  colorScheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemePreferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useRNColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await SecureStore.getItemAsync('fitpro_theme_mode');
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved as ThemeMode);
        }
      } catch (e) {
        console.error('Error loading theme mode:', e);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await SecureStore.setItemAsync('fitpro_theme_mode', mode);
    } catch (e) {
      console.error('Error saving theme mode:', e);
    }
  };

  const resolvedScheme = themeMode === 'system'
    ? (systemScheme === 'unspecified' || !systemScheme ? 'light' : systemScheme)
    : themeMode;

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, colorScheme: resolvedScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useColorScheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    const system = useRNColorScheme();
    return system === 'dark' ? 'dark' : 'light';
  }
  return context.colorScheme;
}

export function useThemePreference() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }
  return context;
}
