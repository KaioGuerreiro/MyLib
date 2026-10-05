import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { TipoMeta } from '../models/Meta';
import { setUserGoal } from '../services/goalService';

export interface SetGoalModalProps {
  visible: boolean;
  usuarioId: string;
  tipoMeta: TipoMeta;
  valorAtual: number;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_PAGINAS = [10, 20, 30, 50];
const PRESET_LIVROS = [1, 2, 3, 5];

export default function SetGoalModal({
  visible,
  usuarioId,
  tipoMeta,
  valorAtual,
  onClose,
  onSuccess,
}: SetGoalModalProps) {
  const { isDark } = useTheme();
  const isDaily = tipoMeta === 'paginas_dia';
  const presets = isDaily ? PRESET_PAGINAS : PRESET_LIVROS;

  const [valor, setValor] = useState<string>(
    valorAtual > 0 ? String(valorAtual) : isDaily ? '20' : '2'
  );
  const [salvando, setSalvando] = useState(false);

  // Atualiza o estado quando o modal abre com novo valorAtual
  React.useEffect(() => {
    if (visible) {
      setValor(valorAtual > 0 ? String(valorAtual) : isDaily ? '20' : '2');
    }
  }, [visible, valorAtual, isDaily]);

  const handleSalvar = async () => {
    const num = parseInt(valor, 10);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Valor inválido', 'Por favor insira um valor numérico maior que zero.');
      return;
    }

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSalvando(true);
    try {
      await setUserGoal(usuarioId, tipoMeta, num);
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Erro ao salvar meta', err?.message || 'Tente novamente mais tarde.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? '#1C1A2E' : '#FFFFFF',
              borderColor: isDark ? 'rgba(215, 210, 255, 0.2)' : 'rgba(108, 92, 231, 0.2)',
            },
          ]}
        >
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.headerIconWrapper}>
              <Ionicons
                name={isDaily ? 'flash' : 'library'}
                size={22}
                color="#6C5CE7"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1A1824' }]}>
                {isDaily ? 'Meta Diária de Páginas' : 'Meta Mensal de Livros'}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#666380' },
                ]}
              >
                {isDaily
                  ? 'Quantas páginas você quer ler todo dia?'
                  : 'Quantos livros você planeja concluir no mês?'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons
                name="close"
                size={24}
                color={isDark ? 'rgba(255, 255, 255, 0.5)' : '#999'}
              />
            </TouchableOpacity>
          </View>

          {/* Atalhos Rápidos (Chips) */}
          <Text
            style={[
              styles.sectionLabel,
              { color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#444' },
            ]}
          >
            Sugestões rápidas:
          </Text>
          <View style={styles.presetsRow}>
            {presets.map((preset) => {
              const selecionado = valor === String(preset);
              return (
                <TouchableOpacity
                  key={preset}
                  onPress={() => {
                    if (Platform.OS === 'ios') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setValor(String(preset));
                  }}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: selecionado
                        ? '#6C5CE7'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.06)'
                        : 'rgba(108, 92, 231, 0.08)',
                      borderColor: selecionado
                        ? '#8E7BFF'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(108, 92, 231, 0.2)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: selecionado ? '#FFFFFF' : isDark ? '#EEE' : '#444' },
                    ]}
                  >
                    {preset} {isDaily ? 'pág' : 'livros'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Campo de Entrada Numérica */}
          <Text
            style={[
              styles.sectionLabel,
              { color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#444', marginTop: 16 },
            ]}
          >
            Ou personalize o valor:
          </Text>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F5F5FA',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(108, 92, 231, 0.2)',
              },
            ]}
          >
            <TextInput
              value={valor}
              onChangeText={(text) => setValor(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={4}
              style={[styles.input, { color: isDark ? '#FFFFFF' : '#1A1824' }]}
              placeholder="0"
              placeholderTextColor={isDark ? '#666' : '#AAA'}
            />
            <Text style={[styles.inputUnit, { color: isDark ? '#AAA' : '#666' }]}>
              {isDaily ? 'páginas/dia' : 'livros/mês'}
            </Text>
          </View>

          {/* Ações */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#EBEBF2' },
              ]}
              onPress={onClose}
            >
              <Text
                style={[
                  styles.cancelText,
                  { color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#555' },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              disabled={salvando}
              onPress={handleSalvar}
            >
              <LinearGradient
                colors={['#6C5CE7', '#8E7BFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveGradient}
              >
                <Text style={styles.saveText}>
                  {salvando ? 'Salvando...' : 'Definir Meta'}
                </Text>
              </LinearGradient>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    height: '100%',
  },
  inputUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  saveGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
