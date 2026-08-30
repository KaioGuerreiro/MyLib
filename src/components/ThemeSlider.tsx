import React from 'react';
import { Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DARK, LIGHT } from '../theme/colors';

const TRACK_W = 64;
const THUMB_SIZE = 24;
const THUMB_TRAVEL = TRACK_W - THUMB_SIZE - 8;

interface ThemeSliderProps {
  isDark: boolean;
  onToggle: () => void;
  anim: Animated.Value;
}

export function ThemeSlider({ isDark, onToggle, anim }: ThemeSliderProps) {
  const theme = isDark ? DARK : LIGHT;

  const thumbX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, THUMB_TRAVEL],
  });

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [LIGHT.trackInactive, DARK.trackActive],
  });

  return (
    <Pressable
      onPress={onToggle}
      accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      id="btn-toggle-theme"
    >
      <Animated.View
        className="w-16 h-8 rounded-full border-[1.5px] justify-center overflow-hidden"
        style={{ backgroundColor: trackColor, borderColor: theme.trackBorder }}
      >
        <Animated.View
          className="w-6 h-6 rounded-full items-center justify-center shadow-md elevation-4"
          style={{
            transform: [{ translateX: thumbX }],
            backgroundColor: theme.thumb,
            shadowColor: theme.primaryShadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.35,
            shadowRadius: 4,
          }}
        >
          <Ionicons
            name={isDark ? 'moon' : 'sunny'}
            size={13}
            color={isDark ? theme.bg : theme.primary}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
