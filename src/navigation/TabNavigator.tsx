import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  LayoutChangeEvent,
  Pressable,
} from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView, GlassContainer, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme/colors';

// Import Screens
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import LibraryScreen from '../screens/LibraryScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  'Início': { active: 'home', inactive: 'home-outline' },
  'Busca': { active: 'search', inactive: 'search-outline' },
  'Biblioteca': { active: 'library', inactive: 'library-outline' },
  'Conquistas': { active: 'trophy', inactive: 'trophy-outline' },
};

const TAB_BAR_HEIGHT = 62;
const TAB_BAR_RADIUS = 31;
const PADDING_H = 6;
const PILL_HEIGHT = 50;

const isGlassSupported = () => {
  try {
    return Platform.OS === 'ios' && typeof isLiquidGlassAvailable === 'function' && isLiquidGlassAvailable();
  } catch {
    return false;
  }
};
const USE_NATIVE_LIQUID_GLASS = isGlassSupported();

interface TabItemProps {
  name: string;
  isFocused: boolean;
  onPress: () => void;
  isDark: boolean;
  theme: ThemeType;
}

function TabItem({ name, isFocused, onPress, isDark, theme }: TabItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const icons = TAB_ICONS[name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
  const iconName = isFocused ? icons.active : icons.inactive;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      useNativeDriver: true,
      friction: 6,
      tension: 180,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 140,
    }).start();
  };

  const activeColor = isDark ? '#FFFFFF' : theme.accentText;
  const inactiveColor = isDark ? 'rgba(178, 182, 202, 0.70)' : '#6B7088';
  const color = isFocused ? activeColor : inactiveColor;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabItem}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={name}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Animated.View style={[styles.tabItemContent, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name={iconName} size={22} color={color} />
        <Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color,
              fontWeight: isFocused ? '600' : '500',
              opacity: isFocused ? 1 : 0.85,
            },
          ]}
        >
          {name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [containerWidth, setContainerWidth] = useState(0);

  const numTabs = state.routes.length;
  const availableWidth = containerWidth > 0 ? containerWidth - PADDING_H * 2 : 0;
  const tabWidth = availableWidth > 0 ? availableWidth / numTabs : 0;

  // Animação de deslizamento da pílula ativa com física de mola Apple
  const slideAnim = useRef(new Animated.Value(0)).current;
  const currentX = useRef(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
      const innerWidth = width - PADDING_H * 2;
      const tWidth = innerWidth / numTabs;
      const initialX = PADDING_H + state.index * tWidth;
      slideAnim.setValue(initialX);
      currentX.current = initialX;
    }
  };

  useEffect(() => {
    if (tabWidth > 0) {
      const targetX = PADDING_H + state.index * tabWidth;
      Animated.spring(slideAnim, {
        toValue: targetX,
        friction: 8,
        tension: 110,
        useNativeDriver: true,
      }).start();
      currentX.current = targetX;
    }
  }, [state.index, tabWidth, slideAnim]);

  const handleTabPress = useCallback(
    (route: (typeof state.routes)[0], index: number) => {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (state.index !== index && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    },
    [navigation, state]
  );

  // Pílula ativa translúcida com a cor de destaque do tema (menos transparente, com presença e profundidade)
  const renderHighlightPill = () => {
    if (tabWidth === 0) return null;

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.highlightPill,
          {
            width: tabWidth,
            transform: [{ translateX: slideAnim }],
            backgroundColor: isDark ? 'rgba(145, 132, 217, 0.48)' : 'rgba(108, 92, 231, 0.24)',
            borderColor: isDark ? 'rgba(215, 210, 255, 0.55)' : 'rgba(108, 92, 231, 0.40)',
            shadowColor: isDark ? '#9184D9' : '#6C5CE7',
            shadowOpacity: isDark ? 0.32 : 0.18,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 6,
            elevation: 3,
          },
        ]}
      >
        {USE_NATIVE_LIQUID_GLASS && (
          <GlassView
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
            glassEffectStyle="clear"
            tintColor={isDark ? 'rgba(145, 132, 217, 0.30)' : 'rgba(108, 92, 231, 0.18)'}
            isInteractive
          />
        )}
      </Animated.View>
    );
  };

  // Fundo translúcido com tonalidade personalizada e materiais autênticos Apple
  const renderGlassBackground = () => (
    <>
      {USE_NATIVE_LIQUID_GLASS ? (
        <GlassView
          style={[StyleSheet.absoluteFill, { borderRadius: TAB_BAR_RADIUS }]}
          glassEffectStyle="regular"
          tintColor={isDark ? 'rgba(42, 34, 68, 0.55)' : 'rgba(238, 233, 255, 0.60)'}
          colorScheme={isDark ? 'dark' : 'light'}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: TAB_BAR_RADIUS,
              backgroundColor: isDark ? 'rgba(28, 26, 46, 0.90)' : 'rgba(248, 246, 255, 0.92)',
            },
          ]}
        />
      )}

      {/* Sutil brilho especular de luz na curvatura superior do vidro com tonalidade do tema */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(210, 206, 253, 0.16)', 'rgba(145, 132, 217, 0.04)', 'transparent']
            : ['rgba(255, 255, 255, 0.95)', 'rgba(238, 233, 255, 0.40)', 'transparent']
        }
        locations={[0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: TAB_BAR_RADIUS }]}
      />
    </>
  );

  const bottomMargin = Math.max(insets.bottom, 12);

  const borderStyle = {
    borderColor: isDark ? 'rgba(145, 132, 217, 0.25)' : 'rgba(108, 92, 231, 0.16)',
    borderTopColor: isDark ? 'rgba(210, 206, 253, 0.45)' : 'rgba(255, 255, 255, 0.98)',
  };

  const shadowStyle = {
    shadowColor: isDark ? '#7A68C9' : '#4C3ACB',
    shadowOpacity: isDark ? 0.35 : 0.12,
    shadowRadius: isDark ? 20 : 18,
    elevation: isDark ? 10 : 8,
    shadowOffset: { width: 0, height: 8 },
  };

  const containerContent = (
    <>
      {renderGlassBackground()}
      {renderHighlightPill()}
      {state.routes.map((route, index) => (
        <TabItem
          key={route.key}
          name={route.name}
          isFocused={state.index === index}
          onPress={() => handleTabPress(route, index)}
          isDark={isDark}
          theme={theme}
        />
      ))}
    </>
  );

  return (
    <View style={[styles.tabBarShadowWrapper, shadowStyle, { bottom: bottomMargin }]}>
      {USE_NATIVE_LIQUID_GLASS ? (
        <GlassContainer
          spacing={12}
          onLayout={handleLayout}
          style={[styles.tabBarContainer, borderStyle]}
        >
          {containerContent}
        </GlassContainer>
      ) : (
        <View
          onLayout={handleLayout}
          style={[styles.tabBarContainer, borderStyle]}
        >
          {containerContent}
        </View>
      )}
    </View>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Busca" component={SearchScreen} />
      <Tab.Screen name="Biblioteca" component={LibraryScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarShadowWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_RADIUS,
  },
  tabBarContainer: {
    flex: 1,
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_RADIUS,
    alignItems: 'center',
    paddingHorizontal: PADDING_H,
    borderWidth: 1,
  },
  highlightPill: {
    position: 'absolute',
    height: PILL_HEIGHT,
    borderRadius: 20,
    top: (TAB_BAR_HEIGHT - PILL_HEIGHT) / 2,
    borderWidth: 1,
    zIndex: 1,
  },
  tabItem: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  tabItemContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
