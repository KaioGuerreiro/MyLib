import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { AVATARES_DISPONIVEIS, AvatarOption } from '../utils/avatars';

interface AvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  avatarSelecionadoId?: string;
  onSelectAvatar: (avatarId: string) => void;
}

export function AvatarPickerModal({
  visible,
  onClose,
  avatarSelecionadoId = 'owl',
  onSelectAvatar,
}: AvatarPickerModalProps) {
  const { theme, isDark } = useTheme();

  const handleSelect = (item: AvatarOption) => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    onSelectAvatar(item.id);
    onClose();
  };

  const handleClose = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Desfoque Apple nativo no backdrop */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 25 : 35}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: isDark ? 'rgba(28, 26, 46, 0.96)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark ? 'rgba(145, 132, 217, 0.30)' : 'rgba(108, 92, 231, 0.20)',
              borderTopColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.95)',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.title, { color: theme.text }]}>Escolha seu Avatar</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Personalize seu ícone no ranking e na comunidade
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            >
              <Ionicons name="close" size={18} color={theme.text} />
            </Pressable>
          </View>

          {/* Grid de Avatares */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContainer}
          >
            {AVATARES_DISPONIVEIS.map((item) => {
              const isSelected = item.id === avatarSelecionadoId;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelect(item)}
                  style={({ pressed }) => [
                    styles.avatarItem,
                    {
                      backgroundColor: isDark
                        ? isSelected
                          ? 'rgba(108, 92, 231, 0.16)'
                          : 'rgba(255, 255, 255, 0.04)'
                        : isSelected
                        ? 'rgba(108, 92, 231, 0.10)'
                        : 'rgba(248, 246, 255, 0.90)',
                      borderColor: isSelected
                        ? item.cor
                        : isDark
                        ? 'rgba(145, 132, 217, 0.18)'
                        : 'rgba(108, 92, 231, 0.12)',
                      borderWidth: isSelected ? 2 : 1,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                  ]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: item.fundo }]}>
                    <Ionicons name={item.icone} size={28} color={item.cor} />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.avatarName,
                      {
                        color: isSelected ? item.cor : theme.text,
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}
                  >
                    {item.nome}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[styles.avatarDesc, { color: theme.textSecondary }]}
                  >
                    {item.descricao}
                  </Text>

                  {isSelected && (
                    <View style={[styles.badgeCheck, { backgroundColor: item.cor }]}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.50)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 28,
    borderCurve: 'continuous',
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.30,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 10,
  },
  avatarItem: {
    width: '48%',
    borderRadius: 18,
    borderCurve: 'continuous',
    padding: 12,
    alignItems: 'center',
    position: 'relative',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarName: {
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'center',
  },
  avatarDesc: {
    fontSize: 10.5,
    textAlign: 'center',
    lineHeight: 14,
  },
  badgeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
