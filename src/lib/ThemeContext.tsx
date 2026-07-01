import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, THEME_OPTIONS, DEFAULT_THEME, ThemeKey } from './theme';

const STORAGE_KEY = 'app_theme_color';

type ThemeContextValue = {
  themeKey: ThemeKey;
  colors: ReturnType<typeof getColors>;
  GRADIENT_HEADER: [string, string];
  GRADIENT_CARD: [string, string];
  setThemeKey: (key: ThemeKey) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  themeKey: DEFAULT_THEME,
  colors: getColors(DEFAULT_THEME),
  GRADIENT_HEADER: getColors(DEFAULT_THEME).GRADIENT_HEADER,
  GRADIENT_CARD: getColors(DEFAULT_THEME).GRADIENT_CARD,
  setThemeKey: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>(DEFAULT_THEME);

  // Muat pilihan tema tersimpan di device saat app dibuka.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && THEME_OPTIONS.some(t => t.key === saved)) {
          setThemeKeyState(saved as ThemeKey);
        }
      } catch {
        // abaikan, pakai default hijau
      }
    })();
  }, []);

  const setThemeKey = (key: ThemeKey) => {
    setThemeKeyState(key);
    AsyncStorage.setItem(STORAGE_KEY, key).catch(() => {});
  };

  const palette = useMemo(() => getColors(themeKey), [themeKey]);

  const value = useMemo<ThemeContextValue>(() => ({
    themeKey,
    colors: palette,
    GRADIENT_HEADER: palette.GRADIENT_HEADER,
    GRADIENT_CARD: palette.GRADIENT_CARD,
    setThemeKey,
  }), [themeKey, palette]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
