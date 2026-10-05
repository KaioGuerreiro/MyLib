import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Conquista } from '../models/Conquista';
import { useTheme } from '../theme/ThemeContext';

export interface AchievementUnlockedModalProps {
  visible: boolean;
  conquista: Conquista | null;
  onClose: () => void;
}

export default function AchievementUnlockedModal({
  visible,
  conquista,
  onClose,
}: AchievementUnlockedModalProps) {
  const { isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const badgeBounceAnim = useRef(new Animated.Value(0)).current;

  const isUnlocked = conquista?.desbloqueada !== false;

  useEffect(() => {
    if (visible && conquista) {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        if (isUnlocked) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }

      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      badgeBounceAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(150),
          Animated.spring(badgeBounceAnim, {
            toValue: 1,
            friction: 4,
            tension: 120,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [visible, conquista, isUnlocked, scaleAnim, opacityAnim, badgeBounceAnim]);

  if (!conquista) return null;

  const iconName = (conquista.icone as keyof typeof Ionicons.glyphMap) || 'trophy';
  const temProgresso =
    !isUnlocked &&
    typeof conquista.progressoAlvo === 'number' &&
    conquista.progressoAlvo > 0;
  const progressoAtual = conquista.progressoAtual ?? 0;
  const progressoAlvo = conquista.progressoAlvo ?? 1;
  const pctProgresso = Math.min(100, Math.round((progressoAtual / progressoAlvo) * 100));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
              backgroundColor: isDark ? '#1C1A2E' : '#FFFFFF',
              borderColor: isUnlocked
                ? isDark
                  ? 'rgba(215, 210, 255, 0.25)'
                  : 'rgba(108, 92, 231, 0.2)'
                : isDark
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.08)',
              shadowColor: isUnlocked ? '#FFD700' : '#000000',
            },
          ]}
        >
          {/* Brilho superior de conquista */}
          {isUnlocked && (
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.2)', 'rgba(108, 92, 231, 0.05)', 'transparent']}
              style={styles.glowGradient}
            />
          )}

          {/* Badge de Ícone Saltitante */}
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                transform: [
                  {
                    scale: badgeBounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1.15],
                    }),
                  },
                ],
              },
            ]}
          >
            {isUnlocked ? (
              <LinearGradient
                colors={['#FFD700', '#FFA500', '#FF8C00']}
                style={styles.iconCircle}
              >
                <Ionicons name={iconName} size={48} color="#FFFFFF" />
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark ? '#27233B' : '#ECEBF5',
                    shadowOpacity: 0,
                    elevation: 0,
                  },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={42}
                  color={isDark ? '#6A6582' : '#A09CB3'}
                />
                <View style={styles.modalLockOverlay}>
                  <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
                </View>
              </View>
            )}
          </Animated.View>

          <Text
            style={[
              styles.kicker,
              {
                color: isUnlocked
                  ? '#FFB800'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.5)'
                  : '#8E8E93',
              },
            ]}
          >
            {isUnlocked ? 'CONQUISTA DESBLOQUEADA!' : 'CONQUISTA BLOQUEADA'}
          </Text>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1A1824' }]}>
            {conquista.nome}
          </Text>
          <Text
            style={[
              styles.description,
              { color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#5A5672' },
            ]}
          >
            {conquista.descricao}
          </Text>

          {/* Barra de Progresso quando Bloqueada */}
          {temProgresso && (
            <View style={styles.progressSection}>
              <View style={styles.progressRow}>
                <Text
                  style={[
                    styles.progressLabel,
                    { color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#666' },
                  ]}
                >
                  Progresso
                </Text>
                <Text
                  style={[
                    styles.progressValue,
                    { color: isDark ? '#FFFFFF' : '#1A1824' },
                  ]}
                >
                  {progressoAtual} / {progressoAlvo} ({pctProgresso}%)
                </Text>
              </View>
              <View
                style={[
                  styles.progressBarBg,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E0E0E0' },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.max(4, pctProgresso)}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Card de Recompensa de XP */}
          {conquista.recompensaXp ? (
            <View
              style={[
                styles.rewardPill,
                {
                  backgroundColor: isUnlocked
                    ? isDark
                      ? 'rgba(108, 92, 231, 0.25)'
                      : 'rgba(108, 92, 231, 0.12)'
                    : isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.04)',
                  borderColor: isUnlocked
                    ? isDark
                      ? '#9184D9'
                      : '#6C5CE7'
                    : isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(0, 0, 0, 0.1)',
                },
              ]}
            >
              <Ionicons
                name="sparkles"
                size={18}
                color={isUnlocked ? '#FFD700' : isDark ? '#AAA' : '#888'}
              />
              <Text
                style={[
                  styles.rewardText,
                  {
                    color: isUnlocked
                      ? '#FFD700'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.75)'
                      : '#666',
                  },
                ]}
              >
                {isUnlocked
                  ? `+${conquista.recompensaXp} XP Bônus`
                  : `+${conquista.recompensaXp} XP ao desbloquear`}
              </Text>
            </View>
          ) : null}

          {/* Botão de Fechar / Ação */}
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              onClose();
            }}
          >
            <LinearGradient
              colors={isUnlocked ? ['#6C5CE7', '#8E7BFF'] : ['#4A4760', '#353249']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>
                {isUnlocked ? 'Incrível!' : 'Entendi'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  glowGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#FFB800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  rewardText: {
    color: '#FFD700',
    fontWeight: '700',
    fontSize: 14,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalLockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'rgba(30, 27, 46, 0.95)',
    borderRadius: 12,
    padding: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressSection: {
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6C5CE7',
    borderRadius: 4,
  },
});
