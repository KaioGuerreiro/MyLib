import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmDelete: (senha?: string) => Promise<void>;
}

export function DeleteAccountModal({
  visible,
  onClose,
  onConfirmDelete,
}: DeleteAccountModalProps) {
  const { theme, isDark } = useTheme();
  const [senha, setSenha] = useState('');
  const [mostraSenha, setMostraSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    try {
      setCarregando(true);
      setErro(null);
      await onConfirmDelete(senha.trim() ? senha : undefined);
      onClose();
    } catch (err: any) {
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setErro('A senha informada está incorreta.');
      } else if (err?.code === 'auth/requires-recent-login') {
        setErro('Por segurança, informe sua senha atual para autorizar a exclusão.');
      } else {
        setErro(err?.message || 'Falha ao excluir a conta. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  };

  const handleClose = () => {
    if (!carregando) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setSenha('');
      setErro(null);
      onClose();
    }
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
              borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.25)',
              borderTopColor: isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(255, 255, 255, 0.95)',
            },
          ]}
        >
          {/* Ícone de Perigo */}
          <View style={styles.dangerIconContainer}>
            <View style={styles.dangerIconCircle}>
              <Ionicons name="warning" size={30} color="#EF4444" />
            </View>
          </View>

          {/* Título & Alerta */}
          <Text style={[styles.title, { color: theme.text }]}>Excluir Minha Conta</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Esta ação é <Text style={{ color: '#EF4444', fontWeight: '700' }}>permanente e irreversível</Text>.
            Em conformidade com a LGPD e políticas de privacidade:
          </Text>

          {/* Lista de dados a serem excluídos */}
          <View
            style={[
              styles.bulletBox,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.15)',
              },
            ]}
          >
            <View style={styles.bulletItem}>
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
              <Text style={[styles.bulletText, { color: theme.text }]}>
                Todas as sessões de leitura e histórico de páginas
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
              <Text style={[styles.bulletText, { color: theme.text }]}>
                Todos os livros salvos na sua estante pessoal
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
              <Text style={[styles.bulletText, { color: theme.text }]}>
                Seu progresso de XP, ofensiva, medalhas e conquistas
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
              <Text style={[styles.bulletText, { color: theme.text }]}>
                Sua posição no ranking e sua conta de acesso
              </Text>
            </View>
          </View>

          {/* Campo de Senha para Reautenticação */}
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
            Confirme sua senha para autorizar:
          </Text>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: erro ? '#EF4444' : isDark ? 'rgba(145, 132, 217, 0.25)' : 'rgba(108, 92, 231, 0.20)',
              },
            ]}
          >
            <Ionicons name="lock-closed-outline" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!mostraSenha}
              placeholder="Digite sua senha"
              placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)'}
              style={[styles.input, { color: theme.text }]}
              autoCapitalize="none"
              editable={!carregando}
            />
            <Pressable onPress={() => setMostraSenha(!mostraSenha)} hitSlop={8}>
              <Ionicons
                name={mostraSenha ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.textSecondary}
              />
            </Pressable>
          </View>

          {/* Mensagem de Erro */}
          {erro && (
            <View style={styles.erroContainer}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={styles.erroText}>{erro}</Text>
            </View>
          )}

          {/* Botões de Ação */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={carregando}
              style={[
                styles.cancelButton,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#EBEBF2' },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelButtonText, { color: isDark ? 'rgba(255, 255, 255, 0.8)' : '#555' }]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={carregando}
              style={[
                styles.deleteButton,
                { backgroundColor: '#EF4444' },
                carregando && { opacity: 0.7 },
              ]}
              activeOpacity={0.8}
            >
              {carregando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteButtonText}>Excluir Tudo</Text>
              )}
            </TouchableOpacity>
          </View>
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
    borderRadius: 28,
    borderCurve: 'continuous',
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  dangerIconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
  },
  bulletBox: {
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 14,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulletText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  erroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  erroText: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1.5,
    height: 50,
    borderRadius: 25,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
