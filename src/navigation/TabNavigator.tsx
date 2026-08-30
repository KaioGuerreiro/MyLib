import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Animated,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
} from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, GlassContainer, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';

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

const TAB_BAR_HEIGHT = 64;
const BUBBLE_WIDTH = 58;
const BUBBLE_HEIGHT = 48;
const TAB_BAR_RADIUS = 32;
const BUBBLE_RADIUS = 24;

const USE_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme, isDark } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const numTabs = state.routes.length;
  const tabWidth = containerWidth > 0 ? containerWidth / numTabs : 0;

  // Animação de posição e deformação da bolha líquida
  const slideAnim = useRef(new Animated.Value(0)).current;
  const currentX = useRef(0);
  const scaleXAnim = useRef(new Animated.Value(1)).current;
  const scaleYAnim = useRef(new Animated.Value(1)).current;
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const lastHover = useRef(state.index);

  useEffect(() => {
    const id = slideAnim.addListener(({ value }) => {
      currentX.current = value;
    });
    return () => slideAnim.removeListener(id);
  }, [slideAnim]);

  const getTabPosition = (index: number, width: number) => {
    const tWidth = width / numTabs;
    return index * tWidth + (tWidth - BUBBLE_WIDTH) / 2;
  };

  // Transição fluida de posição com física de mola Apple
  useEffect(() => {
    if (tabWidth > 0 && !isDragging.current) {
      const targetX = getTabPosition(state.index, containerWidth);

      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleXAnim, {
            toValue: 1.15,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(scaleXAnim, {
            toValue: 1,
            friction: 7,
            tension: 140,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scaleYAnim, {
            toValue: 0.90,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(scaleYAnim, {
            toValue: 1,
            friction: 7,
            tension: 140,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(slideAnim, {
          toValue: targetX,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      lastHover.current = state.index;
    }
  }, [state.index, tabWidth, containerWidth]);

  // Gesto PanResponder para arrastar a bolha líquida
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 3,

        onPanResponderGrant: () => {
          isDragging.current = true;
          dragStartX.current = currentX.current;

          Animated.parallel([
            Animated.spring(scaleXAnim, {
              toValue: 1.08,
              friction: 6,
              useNativeDriver: true,
            }),
            Animated.spring(scaleYAnim, {
              toValue: 0.94,
              friction: 6,
              useNativeDriver: true,
            }),
          ]).start();

          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        },

        onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
          if (!tabWidth) return;

          const minX = (tabWidth - BUBBLE_WIDTH) / 2 - 8;
          const maxX = (numTabs - 1) * tabWidth + (tabWidth - BUBBLE_WIDTH) / 2 + 8;
          let newX = dragStartX.current + gestureState.dx;

          // Resistência elástica suave
          if (newX < minX) {
            newX = minX - Math.sqrt(Math.abs(newX - minX)) * 2;
          } else if (newX > maxX) {
            newX = maxX + Math.sqrt(newX - maxX) * 2;
          }

          slideAnim.setValue(newX);

          const bubbleCenter = newX + BUBBLE_WIDTH / 2;
          const currentTab = Math.min(
            Math.max(Math.floor(bubbleCenter / tabWidth), 0),
            numTabs - 1
          );

          if (currentTab !== lastHover.current) {
            lastHover.current = currentTab;
            setHoverIndex(currentTab);
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }
        },

        onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
          isDragging.current = false;
          setHoverIndex(null);

          if (!tabWidth) return;

          let targetIndex: number;

          if (Math.abs(gestureState.dx) < 6) {
            const touchX = gestureState.x0;
            targetIndex = Math.min(
              Math.max(Math.floor((touchX - 24) / tabWidth), 0),
              numTabs - 1
            );
          } else {
            const finalCenter = currentX.current + BUBBLE_WIDTH / 2;
            targetIndex = Math.min(
              Math.max(Math.round((finalCenter - tabWidth / 2) / tabWidth), 0),
              numTabs - 1
            );
          }

          const targetX = getTabPosition(targetIndex, containerWidth);

          Animated.parallel([
            Animated.spring(scaleXAnim, {
              toValue: 1,
              friction: 6,
              tension: 130,
              useNativeDriver: true,
            }),
            Animated.spring(scaleYAnim, {
              toValue: 1,
              friction: 6,
              tension: 130,
              useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
              toValue: targetX,
              friction: 7,
              tension: 110,
              useNativeDriver: true,
            }),
          ]).start();

          if (targetIndex !== state.index) {
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            navigation.navigate(state.routes[targetIndex].name);
          }
        },

        onPanResponderTerminate: () => {
          isDragging.current = false;
          setHoverIndex(null);
          const targetX = getTabPosition(state.index, containerWidth);
          Animated.spring(slideAnim, {
            toValue: targetX,
            friction: 7,
            useNativeDriver: true,
          }).start();
        },
      }),
    [tabWidth, containerWidth, numTabs, state.index, navigation, state.routes]
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setContainerWidth(width);
    if (width > 0) {
      const initialX = getTabPosition(state.index, width);
      slideAnim.setValue(initialX);
      currentX.current = initialX;
    }
  };

  // Bolha de Liquid Glass pura (estilo nativo Apple)
  const renderLiquidBubble = () => {
    if (tabWidth === 0) return null;

    if (USE_GLASS) {
      return (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bubbleContainer,
            {
              transform: [
                { translateX: slideAnim },
                { scaleX: scaleXAnim },
                { scaleY: scaleYAnim },
              ],
            },
          ]}
        >
          {/* GlassView com isInteractive para refração real e specular highlight do iOS */}
          <GlassView
            style={styles.liquidGlassBubble}
            glassEffectStyle="clear"
            isInteractive
          />
        </Animated.View>
      );
    }

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bubbleContainer,
          styles.fallbackBubble,
          {
            backgroundColor: `${theme.accent}30`,
            borderColor: `${theme.accent}60`,
            transform: [
              { translateX: slideAnim },
              { scaleX: scaleXAnim },
              { scaleY: scaleYAnim },
            ],
          },
        ]}
      />
    );
  };

  const content = (
    <>
      {renderLiquidBubble()}
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isHovered = hoverIndex === index;
        const isActive = hoverIndex !== null ? isHovered : isFocused;

        const icons = TAB_ICONS[route.name] ?? { active: 'home', inactive: 'home-outline' };
        const iconName = isActive ? icons.active : icons.inactive;

        return (
          <View
            key={route.key}
            style={styles.tabItem}
            pointerEvents="none"
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
          >
            <Ionicons
              name={iconName}
              size={24}
              color={
                isActive
                  ? (isDark ? '#FFFFFF' : theme.accent)
                  : (isDark ? '#989AA8' : '#75798C')
              }
            />
          </View>
        );
      })}
    </>
  );

  if (USE_GLASS) {
    return (
      <View style={styles.tabBarShadowWrapper}>
        <GlassContainer spacing={12} style={styles.tabBarContainer} {...panResponder.panHandlers}>
          {/* Fundo da barra com Liquid Glass nativo */}
          <GlassView
            onLayout={handleLayout}
            style={styles.glassBackground}
            glassEffectStyle="regular"
            colorScheme={isDark ? 'dark' : 'light'}
          />
          {content}
        </GlassContainer>
      </View>
    );
  }

  return (
    <View style={styles.tabBarShadowWrapper}>
      <View
        onLayout={handleLayout}
        style={[styles.tabBarContainer, styles.tabBarFallback]}
        {...panResponder.panHandlers}
      >
        {content}
      </View>
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
    bottom: 24,
    left: 24,
    right: 24,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_RADIUS,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 10,
  },
  tabBarContainer: {
    flex: 1,
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_RADIUS,
    alignItems: 'center',
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TAB_BAR_RADIUS,
  },
  tabBarFallback: {
    backgroundColor: '#1C1C22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: TAB_BAR_RADIUS,
    overflow: 'hidden',
  },
  bubbleContainer: {
    position: 'absolute',
    width: BUBBLE_WIDTH,
    height: BUBBLE_HEIGHT,
    borderRadius: BUBBLE_RADIUS,
    top: (TAB_BAR_HEIGHT - BUBBLE_HEIGHT) / 2,
    zIndex: 1,
  },
  liquidGlassBubble: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BUBBLE_RADIUS,
  },
  fallbackBubble: {
    borderRadius: BUBBLE_RADIUS,
    borderWidth: 1.5,
  },
  tabItem: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});
