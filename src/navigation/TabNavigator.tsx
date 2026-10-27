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
import { BlurView } from 'expo-blur';
import { GlassView, GlassContainer, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme/colors';

// Import Screens
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import LibraryScreen from '../screens/LibraryScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  'Início': { active: 'home', inactive: 'home-outline' },
  'Busca': { active: 'search', inactive: 'search-outline' },
  'Biblioteca': { active: 'library', inactive: 'library-outline' },
  'Conquistas': { active: 'trophy', inactive: 'trophy-outline' },
  'Perfil': { active: 'person', inactive: 'person-outline' },
};

// Dimensões com proporções e curvatura concêntrica Apple HIG (32 outer - 6 padding = 26 inner)
const TAB_BAR_HEIGHT = 64;
const TAB_BAR_RADIUS = 32;
const PADDING_H = 6;
const PILL_HEIGHT = 52;
const PILL_RADIUS = 26;

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

function TabItem({ name, isFocused, onPress, isDark }: TabItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const icons = TAB_ICONS[name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
  const iconName = isFocused ? icons.active : icons.inactive;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.90,
      useNativeDriver: true,
      friction: 7,
      tension: 200,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 160,
    }).start();
  };

  // Cores de alta fidelidade e contraste Apple HIG
  const activeColor = isDark ? '#FFFFFF' : '#5856D6';
  const inactiveColor = isDark ? 'rgba(235, 235, 245, 0.55)' : 'rgba(60, 60, 67, 0.58)';
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
              opacity: isFocused ? 1 : 0.82,
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

  // Animação de deslizamento da pílula ativa com física de mola fluida Apple
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
        friction: 13,
        tension: 180,
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

  // Pílula ativa com efeito lente de vidro translúcido Apple (Glass Pill)
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
            shadowColor: isDark ? '#9184D9' : '#2B1B6D',
            shadowOpacity: isDark ? 0.28 : 0.12,
            shadowRadius: isDark ? 10 : 8,
            elevation: isDark ? 4 : 2,
          },
        ]}
      >
        {/* Desfoque de vidro interno da pílula (duplo vidro translúcido Apple) */}
        <BlurView
          intensity={isDark ? 30 : 40}
          tint={isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
          style={[StyleSheet.absoluteFill, { borderRadius: PILL_RADIUS, overflow: 'hidden' }]}
        />

        {USE_NATIVE_LIQUID_GLASS && (
          <GlassView
            style={[StyleSheet.absoluteFill, { borderRadius: PILL_RADIUS }]}
            glassEffectStyle="clear"
            tintColor={isDark ? 'rgba(165, 148, 249, 0.20)' : 'rgba(108, 92, 231, 0.12)'}
            isInteractive
          />
        )}

        {/* Tonalidade Apple translúcida da pílula */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: PILL_RADIUS,
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.70)',
            },
          ]}
        />

        {/* Brilho especular na curvatura superior da pílula */}
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255, 255, 255, 0.30)', 'rgba(255, 255, 255, 0.05)', 'transparent']
              : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.25)', 'transparent']
          }
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: PILL_RADIUS }]}
        />

        {/* Borda chanfrada de precisão óptica */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: PILL_RADIUS,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(108, 92, 231, 0.16)',
              borderTopColor: isDark ? 'rgba(255, 255, 255, 0.45)' : '#FFFFFF',
              borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(108, 92, 231, 0.20)',
            },
          ]}
        />
      </Animated.View>
    );
  };

  // Fundo translúcido com camadas ópticas de vidro líquido Apple
  const renderGlassBackground = () => (
    <>
      {/* 1. Base BlurView nativo iOS / Android (garante desfoque de vidro real mesmo sem iOS 26) */}
      <BlurView
        intensity={isDark ? 92 : 88}
        tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
        style={[StyleSheet.absoluteFill, { borderRadius: TAB_BAR_RADIUS, overflow: 'hidden' }]}
      />

      {/* 2. Suporte Nativo a Liquid Glass (UIVisualEffectView / UIGlassEffect em iOS 26+) */}
      {USE_NATIVE_LIQUID_GLASS && (
        <GlassView
          style={[StyleSheet.absoluteFill, { borderRadius: TAB_BAR_RADIUS }]}
          glassEffectStyle="regular"
          tintColor={isDark ? 'rgba(42, 34, 68, 0.35)' : 'rgba(238, 233, 255, 0.40)'}
          colorScheme={isDark ? 'dark' : 'light'}
        />
      )}

      {/* 3. Tonalidade atmosférica translúcida (Apple Material Tint) */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: TAB_BAR_RADIUS,
            backgroundColor: isDark
              ? 'rgba(20, 16, 36, 0.48)'
              : 'rgba(255, 255, 255, 0.52)',
          },
        ]}
      />

      {/* 4. Brilho especular Apple (Luz refletida no bisel curvado superior) */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(255, 255, 255, 0.24)', 'rgba(215, 210, 255, 0.04)', 'transparent']
            : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.35)', 'transparent']
        }
        locations={[0, 0.35, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: TAB_BAR_RADIUS }]}
      />

      {/* 5. Sutil caústica/profundidade na curvatura inferior do vidro */}
      <LinearGradient
        colors={
          isDark
            ? ['transparent', 'rgba(0, 0, 0, 0.22)']
            : ['transparent', 'rgba(108, 92, 231, 0.05)']
        }
        locations={[0.65, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: TAB_BAR_RADIUS }]}
      />
    </>
  );

  const bottomMargin = Math.max(insets.bottom, 12);

  const borderStyle = {
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.75)',
    borderTopColor: isDark ? 'rgba(255, 255, 255, 0.42)' : 'rgba(255, 255, 255, 0.98)',
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)',
  };

  const shadowStyle = {
    shadowColor: isDark ? '#000000' : '#1E124A',
    shadowOpacity: isDark ? 0.45 : 0.12,
    shadowRadius: isDark ? 24 : 20,
    elevation: isDark ? 12 : 8,
    shadowOffset: { width: 0, height: 10 },
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
      <Tab.Screen name="Conquistas" component={AchievementsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarShadowWrapper: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_RADIUS,
  },
  tabBarContainer: {
    flex: 1,
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_RADIUS,
    borderCurve: 'continuous',
    alignItems: 'center',
    paddingHorizontal: PADDING_H,
    borderWidth: 1,
    overflow: 'hidden',
  },
  highlightPill: {
    position: 'absolute',
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    top: (TAB_BAR_HEIGHT - PILL_HEIGHT) / 2,
    zIndex: 1,
    shadowOffset: { width: 0, height: 2 },
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
    gap: 2,
  },
  tabLabel: {
    fontSize: 10.5,
    letterSpacing: 0.25,
    marginTop: 2,
  },
});
