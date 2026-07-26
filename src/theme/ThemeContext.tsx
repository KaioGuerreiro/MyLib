import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { DARK, LIGHT, ThemeType } from './colors';

interface ThemeContextData {
  isDark: boolean;
  theme: ThemeType;
  toggleTheme: () => void;
  setIsDark: (isDark: boolean) => void;
  toggleAnim: Animated.Value;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDarkState] = useState(true);
  const toggleAnim = useRef(new Animated.Value(1)).current;

  const setIsDark = (dark: boolean) => {
    setIsDarkState(dark);
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
      {children}
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
