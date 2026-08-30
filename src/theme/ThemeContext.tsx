import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { View, Animated, Easing } from 'react-native';
import { vars, useColorScheme } from 'nativewind';
import { DARK, LIGHT, ThemeType } from './colors';

export const darkVars = vars({
  '--color-bg': '22 24 38',
  '--color-surface': '35 37 50',
  '--color-card': '35 37 50',
  '--color-card-border': '46 50 68',
  '--color-accent': '145 132 217',
  '--color-accent-text': '210 206 253',
  '--color-primary': '145 132 217',
  '--color-text-primary': '233 233 237',
  '--color-text-secondary': '178 182 202',
  '--color-text-muted': '117 121 140',
  '--color-label': '178 182 202',
  '--color-success': '127 196 160',
  '--color-warning': '224 165 78',
  '--color-danger': '224 115 107',
  '--color-streak': '224 138 90',
  '--color-input-bg': '28 30 45',
  '--color-input-border': '46 50 68',
});

export const lightVars = vars({
  '--color-bg': '245 246 250',
  '--color-surface': '255 255 255',
  '--color-card': '255 255 255',
  '--color-card-border': '226 229 238',
  '--color-accent': '145 132 217',
  '--color-accent-text': '108 92 231',
  '--color-primary': '145 132 217',
  '--color-text-primary': '22 24 38',
  '--color-text-secondary': '91 96 119',
  '--color-text-muted': '117 121 140',
  '--color-label': '108 92 231',
  '--color-success': '127 196 160',
  '--color-warning': '224 165 78',
  '--color-danger': '224 115 107',
  '--color-streak': '224 138 90',
  '--color-input-bg': '237 239 245',
  '--color-input-border': '213 217 229',
});

interface ThemeContextData {
  isDark: boolean;
  theme: ThemeType;
  toggleTheme: () => void;
  setIsDark: (isDark: boolean) => void;
  toggleAnim: Animated.Value;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setColorScheme } = useColorScheme();
  const [isDark, setIsDarkState] = useState(true);
  const toggleAnim = useRef(new Animated.Value(1)).current;

  // Initialize NativeWind theme to dark on mount
  useEffect(() => {
    try {
      setColorScheme('dark');
    } catch {
      // Ignore in test environments
    }
  }, [setColorScheme]);

  const setIsDark = (dark: boolean) => {
    setIsDarkState(dark);
    try {
      setColorScheme(dark ? 'dark' : 'light');
    } catch {
      // Ignore
    }
    Animated.timing(toggleAnim, {
      toValue: dark ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.out(Easing.back(1.4)),
    }).start();
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const theme = isDark ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ isDark, theme, toggleTheme, setIsDark, toggleAnim }}>
      <View style={isDark ? darkVars : lightVars} className="flex-1">
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextData {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}
