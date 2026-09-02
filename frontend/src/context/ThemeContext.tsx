import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_PALETTES, ThemePalette } from '../styles/theme';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: ThemePalette;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const STORAGE_KEY = '@safecircle_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  theme: THEME_PALETTES.dark,
  themeMode: 'dark',
  isDark: true,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  // Load saved theme preference on startup
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedMode === 'dark' || savedMode === 'light' || savedMode === 'system') {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (err) {
        console.log('[ThemeContext] Error loading theme preference:', err);
      }
    };
    loadThemePreference();
  }, []);

  const isDark =
    themeMode === 'system'
      ? systemColorScheme !== 'light'
      : themeMode === 'dark';

  const theme = isDark ? THEME_PALETTES.dark : THEME_PALETTES.light;

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch (err) {
      console.log('[ThemeContext] Error saving theme preference:', err);
    }
  };

  const toggleTheme = async () => {
    const newMode: ThemeMode = isDark ? 'light' : 'dark';
    await setThemeMode(newMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        isDark,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: THEME_PALETTES.dark,
      themeMode: 'dark',
      isDark: true,
      setThemeMode: async () => {},
      toggleTheme: async () => {},
    };
  }
  return context;
};
