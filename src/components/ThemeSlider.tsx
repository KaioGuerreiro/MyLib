import React from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DARK, LIGHT } from '../theme/colors';

const TRACK_W = 64;
const TRACK_H = 32;
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
        style={[
          styles.track,
          { backgroundColor: trackColor, borderColor: theme.trackBorder },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX: thumbX }],
              backgroundColor: theme.thumb,
              shadowColor: theme.primaryShadow,
            },
          ]}
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

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    borderWidth: 1.5,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
});
