import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Conquista, CategoriaConquista } from '../models/Conquista';
import { TipoMeta } from '../models/Meta';
import {
  fetchUserAchievements,
  obterConquistasComProgresso,
  StatsUsuario,
} from '../services/achievementService';
import {
  fetchUserGoals,
  MetasUsuario,
} from '../services/goalService';
import {
  obterConfiguracaoLembrete,
  salvarConfiguracaoLembrete,
  ConfiguracaoLembrete,
} from '../services/notificationService';
import { subscribeToUserBookshelf, ItemEstanteCompleto } from '../services/bookshelfService';
import SetGoalModal from '../components/SetGoalModal';
import AchievementUnlockedModal from '../components/AchievementUnlockedModal';

const CATEGORIAS: { id: CategoriaConquista | 'todas'; rotulo: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'todas', rotulo: 'Todas', icone: 'apps' },
  { id: 'streak', rotulo: 'Ofensiva', icone: 'flame' },
  { id: 'livros', rotulo: 'Livros', icone: 'book' },
  { id: 'paginas', rotulo: 'Páginas', icone: 'layers' },
  { id: 'geral', rotulo: 'Geral', icone: 'trophy' },
];

const HORARIOS_PRESET = [
  { rotulo: '19:00', hora: 19, minuto: 0 },
  { rotulo: '20:00', hora: 20, minuto: 0 },
  { rotulo: '21:00', hora: 21, minuto: 0 },
  { rotulo: '22:00', hora: 22, minuto: 0 },
];

export default function AchievementsScreen() {
  const { isDark, theme } = useTheme();
  const { user, userData } = useAuth();
  const insets = useSafeAreaInsets();

  // Estados de dados
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [conquistasDesbloqueadas, setConquistasDesbloqueadas] = useState<Conquista[]>([]);
  const [metas, setMetas] = useState<MetasUsuario>({});
  const [estante, setEstante] = useState<ItemEstanteCompleto[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaConquista | 'todas'>('todas');

  // Notificações
  const [lembreteConfig, setLembreteConfig] = useState<ConfiguracaoLembrete>({
    ativo: false,
    hora: 20,
    minuto: 0,
  });
  const [salvandoLembrete, setSalvandoLembrete] = useState(false);

  // Modais
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [selectedGoalType, setSelectedGoalType] = useState<TipoMeta>('paginas_dia');
  const [selectedGoalCurrentValue, setSelectedGoalCurrentValue] = useState(0);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Conquista | null>(null);

  const ofensivaAtual = userData?.ofensivaAtual ?? 0;
  const nivelAtual = userData?.nivelAtual ?? 1;

  // Carregar estante em tempo real para estatísticas
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToUserBookshelf(
      user.uid,
      (items) => setEstante(items),
      () => {}
    );
    return () => unsub();
  }, [user?.uid]);

  // Carregar dados de conquistas, metas e lembrete
  const carregarDados = useCallback(async () => {
    if (!user?.uid) {
      setCarregando(false);
      return;
    }

    try {
      const [conquistasRes, metasRes, lembreteRes] = await Promise.all([
        fetchUserAchievements(user.uid),
        fetchUserGoals(user.uid),
        obterConfiguracaoLembrete(user.uid),
      ]);

      setConquistasDesbloqueadas(conquistasRes);
      setMetas(metasRes);
      setLembreteConfig(lembreteRes);
    } catch (err) {
      console.warn('Erro ao carregar dados de engajamento:', err);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [user]);

  // Recarrega sempre que a tela de conquistas ganha foco
  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [carregarDados])
  );

  const onRefresh = () => {
    setAtualizando(true);
    carregarDados();
  };

  // Calcular estatísticas agregadas
  const statsUsuario: StatsUsuario = useMemo(() => {
    let livrosLidosTotal = 0;
    let paginasLidasTotal = 0;

    estante.forEach((item) => {
      if (item.status === 'LIDO') {
        livrosLidosTotal++;
      }
      paginasLidasTotal += item.progressoPaginas || 0;
    });

    const metasAtingidasTotal =
      (metas.metaDiaria?.atingida ? 1 : 0) + (metas.metaMensal?.atingida ? 1 : 0);

    return {
      streakAtual: ofensivaAtual,
      livrosLidosTotal,
      paginasLidasTotal,
      nivelAtual,
      metasAtingidasTotal,
    };
  }, [estante, ofensivaAtual, nivelAtual, metas]);

  // Lista de conquistas com progresso mesclado
  const todasConquistas = useMemo(() => {
    return obterConquistasComProgresso(conquistasDesbloqueadas, statsUsuario);
  }, [conquistasDesbloqueadas, statsUsuario]);

  // Filtrar conquistas pela categoria selecionada
  const conquistasFiltradas = useMemo(() => {
    if (categoriaAtiva === 'todas') return todasConquistas;
    return todasConquistas.filter((c) => c.categoria === categoriaAtiva);
  }, [todasConquistas, categoriaAtiva]);

  const totalDesbloqueadas = conquistasDesbloqueadas.length;
  const totalGeral = todasConquistas.length;
  const percentualConcluido = totalGeral > 0 ? Math.round((totalDesbloqueadas / totalGeral) * 100) : 0;
  const totalXpRecompensas = conquistasDesbloqueadas.reduce(
    (acc, curr) => acc + (curr.recompensaXp || 0),
    0
  );

  // Ações de Metas
  const handleAbrirEdicaoMeta = (tipo: TipoMeta, valorAtual: number) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedGoalType(tipo);
    setSelectedGoalCurrentValue(valorAtual);
    setGoalModalVisible(true);
  };

  // Ações de Lembrete Diário
  const handleToggleLembrete = async (novoValor: boolean) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const anteriorConfig = lembreteConfig;
    const novaConfig = { ...lembreteConfig, ativo: novoValor };
    setSalvandoLembrete(true);

    try {
      const resultado = await salvarConfiguracaoLembrete(
        novaConfig,
        user?.uid,
        {
          ofensivaAtual,
          ultimaLeituraData: userData?.ultimaLeituraData ?? null,
        }
      );

      if (resultado === 'sem_permissao') {
        setLembreteConfig({ ...novaConfig, ativo: false });
        Alert.alert(
          'Permissão Necessária',
          'Para receber os lembretes diários de leitura, permita o envio de notificações nas configurações do seu dispositivo.'
        );
        return;
      }

      if (resultado === 'erro') {
        setLembreteConfig(anteriorConfig);
        Alert.alert('Aviso', 'Não foi possível atualizar o lembrete.');
        return;
      }

      setLembreteConfig(novaConfig);

      if (resultado === 'agendado' && novoValor) {
        Alert.alert(
          'Lembrete Ativado!',
          `Você receberá uma notificação diária às ${String(novaConfig.hora).padStart(2, '0')}:${String(novaConfig.minuto).padStart(2, '0')} para manter seu hábito.`
        );
      }
    } catch {
      setLembreteConfig(anteriorConfig);
      Alert.alert('Aviso', 'Não foi possível atualizar o lembrete.');
    } finally {
      setSalvandoLembrete(false);
    }
  };

  const handleMudarHorarioLembrete = async (hora: number, minuto: number) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const novaConfig = { ...lembreteConfig, hora, minuto };
    setLembreteConfig(novaConfig);

    if (novaConfig.ativo) {
      setSalvandoLembrete(true);
      await salvarConfiguracaoLembrete(
        novaConfig,
        user?.uid,
        {
          ofensivaAtual,
          ultimaLeituraData: userData?.ultimaLeituraData ?? null,
        }
      );
      setSalvandoLembrete(false);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: isDark ? theme.bg : '#F8F9FE',
          paddingTop: Math.max(insets.top, 16),
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            tintColor="#6C5CE7"
            colors={['#6C5CE7']}
          />
        }
      >
        {/* Título da Tela */}
        <View style={styles.titleSection}>
          <Text
            style={[
              styles.screenTitle,
              { color: isDark ? '#FFFFFF' : '#1A1824' },
            ]}
          >
            Conquistas & Metas
          </Text>
          <Text
            style={[
              styles.screenSubtitle,
              { color: isDark ? 'rgba(255, 255, 255, 0.65)' : '#666380' },
            ]}
          >
            Acompanhe suas medalhas, planeje metas e fortaleça seu hábito
          </Text>
        </View>

        {/* Card Geral de Engajamento e Recompensas [RF007] */}
        <LinearGradient
          colors={
            isDark
              ? ['#31265B', '#1E1B38', '#161426']
              : ['#7C6CF0', '#6C5CE7', '#5644D8']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroKicker}>SISTEMA DE RECOMPENSAS</Text>
              <Text style={styles.heroValue}>
                {totalDesbloqueadas} de {totalGeral}
              </Text>
              <Text style={styles.heroLabel}>Medalhas Conquistadas</Text>

              {/* Barra de Progresso Global */}
              <View style={styles.heroBarBackground}>
                <View
                  style={[
                    styles.heroBarFill,
                    { width: `${percentualConcluido}%` },
                  ]}
                />
              </View>
              <Text style={styles.heroProgressText}>{percentualConcluido}% do mural concluído</Text>
            </View>

            {/* Troféu Dourado em Destaque */}
            <View style={styles.trophyWrapper}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.trophyCircle}
              >
                <Ionicons name="trophy" size={38} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.xpPill}>
                <Ionicons name="sparkles" size={13} color="#FFD700" />
                <Text style={styles.xpPillText}>+{totalXpRecompensas} XP</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* SEÇÃO 1: METAS DE LEITURA [RF010] */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderTitleRow}>
            <Ionicons name="flag" size={20} color="#6C5CE7" />
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? '#FFFFFF' : '#1A1824' },
              ]}
            >
              Minhas Metas
            </Text>
          </View>
          <Text
            style={[
              styles.sectionHint,
              { color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#777' },
            ]}
          >
            Foco & Retenção
          </Text>
        </View>

        <View style={styles.goalsContainer}>
          {/* Card Meta Diária de Páginas */}
          <View
            style={[
              styles.goalCard,
              {
                backgroundColor: isDark ? '#1C1A2E' : '#FFFFFF',
                borderColor: isDark ? 'rgba(215, 210, 255, 0.15)' : 'rgba(108, 92, 231, 0.15)',
              },
            ]}
          >
            <View style={styles.goalCardHeader}>
              <View style={styles.goalIconWrapper}>
                <Ionicons name="flash" size={20} color="#FFB800" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.goalTitle, { color: isDark ? '#FFF' : '#1A1824' }]}>
                  Meta Diária
                </Text>
                <Text style={[styles.goalSubtitle, { color: isDark ? '#AAA' : '#777' }]}>
                  Páginas hoje
                </Text>
              </View>
              {metas.metaDiaria?.atingida ? (
                <View style={styles.achievedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#00C48C" />
                  <Text style={styles.achievedBadgeText}>Atingida!</Text>
                </View>
              ) : null}
            </View>

            {metas.metaDiaria ? (
              <View style={styles.goalBody}>
                <View style={styles.goalProgressRow}>
                  <Text style={[styles.goalProgressNumbers, { color: isDark ? '#FFF' : '#1A1824' }]}>
                    {metas.metaDiaria.progressoAtual}{' '}
                    <Text style={{ fontSize: 13, color: isDark ? '#888' : '#999', fontWeight: 'normal' }}>
                      / {metas.metaDiaria.valorAlvo} pág
                    </Text>
                  </Text>
                  <Text style={[styles.goalProgressPct, { color: '#6C5CE7' }]}>
                    {Math.min(100, Math.round((metas.metaDiaria.progressoAtual / metas.metaDiaria.valorAlvo) * 100))}%
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(5, (metas.metaDiaria.progressoAtual / metas.metaDiaria.valorAlvo) * 100))}%`,
                        backgroundColor: metas.metaDiaria.atingida ? '#00C48C' : '#6C5CE7',
                      },
                    ]}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.goalActionBtn, { borderColor: isDark ? '#3D3560' : '#E0DCFF' }]}
                  onPress={() => handleAbrirEdicaoMeta('paginas_dia', metas.metaDiaria?.valorAlvo || 20)}
                >
                  <Text numberOfLines={1} style={styles.goalActionBtnText}>Ajustar Meta</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyGoalWrapper}>
                <Text style={[styles.emptyGoalText, { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#888' }]}>
                  Não definida
                </Text>
                <TouchableOpacity
                  style={styles.setGoalEmptyBtn}
                  onPress={() => handleAbrirEdicaoMeta('paginas_dia', 20)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={15} color="#6C5CE7" />
                  <Text numberOfLines={1} style={styles.setGoalEmptyBtnText}>Definir Meta</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Card Meta Mensal de Livros */}
          <View
            style={[
              styles.goalCard,
              {
                backgroundColor: isDark ? '#1C1A2E' : '#FFFFFF',
                borderColor: isDark ? 'rgba(215, 210, 255, 0.15)' : 'rgba(108, 92, 231, 0.15)',
              },
            ]}
          >
            <View style={styles.goalCardHeader}>
              <View style={[styles.goalIconWrapper, { backgroundColor: 'rgba(0, 196, 140, 0.15)' }]}>
                <Ionicons name="book" size={20} color="#00C48C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.goalTitle, { color: isDark ? '#FFF' : '#1A1824' }]}>
                  Meta Mensal
                </Text>
                <Text style={[styles.goalSubtitle, { color: isDark ? '#AAA' : '#777' }]}>
                  Livros no mês
                </Text>
              </View>
              {metas.metaMensal?.atingida ? (
                <View style={styles.achievedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#00C48C" />
                  <Text style={styles.achievedBadgeText}>Atingida!</Text>
                </View>
              ) : null}
            </View>

            {metas.metaMensal ? (
              <View style={styles.goalBody}>
                <View style={styles.goalProgressRow}>
                  <Text style={[styles.goalProgressNumbers, { color: isDark ? '#FFF' : '#1A1824' }]}>
                    {metas.metaMensal.progressoAtual}{' '}
                    <Text style={{ fontSize: 13, color: isDark ? '#888' : '#999', fontWeight: 'normal' }}>
                      / {metas.metaMensal.valorAlvo} {metas.metaMensal.valorAlvo === 1 ? 'livro' : 'livros'}
                    </Text>
                  </Text>
                  <Text style={[styles.goalProgressPct, { color: '#00C48C' }]}>
                    {Math.min(100, Math.round((metas.metaMensal.progressoAtual / metas.metaMensal.valorAlvo) * 100))}%
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(5, (metas.metaMensal.progressoAtual / metas.metaMensal.valorAlvo) * 100))}%`,
                        backgroundColor: '#00C48C',
                      },
                    ]}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.goalActionBtn, { borderColor: isDark ? '#3D3560' : '#E0DCFF' }]}
                  onPress={() => handleAbrirEdicaoMeta('livros_mes', metas.metaMensal?.valorAlvo || 2)}
                >
                  <Text numberOfLines={1} style={styles.goalActionBtnText}>Ajustar Meta</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyGoalWrapper}>
                <Text style={[styles.emptyGoalText, { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#888' }]}>
                  Não definida
                </Text>
                <TouchableOpacity
                  style={[styles.setGoalEmptyBtn, { borderColor: '#00C48C' }]}
                  onPress={() => handleAbrirEdicaoMeta('livros_mes', 2)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={15} color="#00C48C" />
                  <Text numberOfLines={1} style={[styles.setGoalEmptyBtnText, { color: '#00C48C' }]}>
                    Definir Meta
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* SEÇÃO 2: LEMBRETE DIÁRIO AUTOMÁTICO (RETENÇÃO) */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderTitleRow}>
            <Ionicons name="notifications" size={20} color="#6C5CE7" />
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? '#FFFFFF' : '#1A1824' },
              ]}
            >
              Lembrete de Leitura Diário
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.reminderCard,
            {
              backgroundColor: isDark ? '#1C1A2E' : '#FFFFFF',
              borderColor: isDark ? 'rgba(215, 210, 255, 0.15)' : 'rgba(108, 92, 231, 0.15)',
            },
          ]}
        >
          <View style={styles.reminderRow}>
            <View style={styles.reminderIconWrapper}>
              <Ionicons
                name={lembreteConfig.ativo ? 'notifications-circle' : 'notifications-off-outline'}
                size={26}
                color={lembreteConfig.ativo ? '#6C5CE7' : isDark ? '#666' : '#999'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.reminderTitle, { color: isDark ? '#FFF' : '#1A1824' }]}>
                Notificação Diária
              </Text>
              <Text style={[styles.reminderSubtitle, { color: isDark ? '#AAA' : '#777' }]}>
                {lembreteConfig.ativo
                  ? `Agendado para às ${String(lembreteConfig.hora).padStart(2, '0')}:${String(lembreteConfig.minuto).padStart(2, '0')}`
                  : 'Receba um aviso para não perder sua ofensiva'}
              </Text>
            </View>
            {salvandoLembrete ? (
              <ActivityIndicator size="small" color="#6C5CE7" />
            ) : (
              <Switch
                value={lembreteConfig.ativo}
                onValueChange={handleToggleLembrete}
                trackColor={{ false: isDark ? '#333' : '#E0E0E0', true: '#6C5CE7' }}
                thumbColor="#FFFFFF"
              />
            )}
          </View>

          {/* Seleção de Horário */}
          {lembreteConfig.ativo && (
            <View style={styles.reminderTimesSection}>
              <Text
                style={[
                  styles.reminderTimesLabel,
                  { color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#555' },
                ]}
              >
                Horário preferido de leitura:
              </Text>
              <View style={styles.timesRow}>
                {HORARIOS_PRESET.map((p) => {
                  const ativo =
                    lembreteConfig.hora === p.hora && lembreteConfig.minuto === p.minuto;
                  return (
                    <TouchableOpacity
                      key={p.rotulo}
                      onPress={() => handleMudarHorarioLembrete(p.hora, p.minuto)}
                      style={[
                        styles.timeChip,
                        {
                          backgroundColor: ativo
                            ? '#6C5CE7'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.06)'
                            : 'rgba(108, 92, 231, 0.08)',
                          borderColor: ativo
                            ? '#8E7BFF'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.12)'
                            : 'rgba(108, 92, 231, 0.2)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          { color: ativo ? '#FFFFFF' : isDark ? '#CCC' : '#555' },
                        ]}
                      >
                        {p.rotulo}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* SEÇÃO 3: MURAL DE MEDALHAS & CONQUISTAS [RF008] */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <View style={styles.sectionHeaderTitleRow}>
            <Ionicons name="medal" size={20} color="#FFD700" />
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? '#FFFFFF' : '#1A1824' },
              ]}
            >
              Mural de Conquistas
            </Text>
          </View>
          <Text
            style={[
              styles.sectionHint,
              { color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#777' },
            ]}
          >
            {totalDesbloqueadas}/{totalGeral} Desbloqueadas
          </Text>
        </View>

        {/* Chips de Categoria */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChipsContainer}
        >
          {CATEGORIAS.map((cat) => {
            const isSelected = categoriaAtiva === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setCategoriaAtiva(cat.id);
                }}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected
                      ? '#6C5CE7'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : '#FFFFFF',
                    borderColor: isSelected
                      ? '#8E7BFF'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.12)'
                      : '#E6E6FA',
                  },
                ]}
              >
                <Ionicons
                  name={cat.icone}
                  size={14}
                  color={isSelected ? '#FFFFFF' : isDark ? '#AAA' : '#666'}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      color: isSelected ? '#FFFFFF' : isDark ? '#CCC' : '#555',
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {cat.rotulo}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Grid de Conquistas */}
        {carregando ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C5CE7" />
            <Text style={{ color: isDark ? '#AAA' : '#666', marginTop: 12 }}>
              Carregando mural de medalhas...
            </Text>
          </View>
        ) : (
          <View style={styles.achievementsGrid}>
            {conquistasFiltradas.map((conquista) => {
              const iconName = (conquista.icone as keyof typeof Ionicons.glyphMap) || 'trophy';
              const desbloqueada = conquista.desbloqueada;

              return (
                <TouchableOpacity
                  key={conquista.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedAchievement(conquista);
                    setDetailModalVisible(true);
                  }}
                  style={[
                    styles.achievementCard,
                    {
                      backgroundColor: isDark
                        ? desbloqueada
                          ? '#23203D'
                          : '#171526'
                        : desbloqueada
                        ? '#FFFFFF'
                        : '#F3F2F8',
                      borderColor: isDark
                        ? desbloqueada
                          ? 'rgba(255, 215, 0, 0.35)'
                          : 'rgba(255, 255, 255, 0.08)'
                        : desbloqueada
                        ? 'rgba(255, 215, 0, 0.45)'
                        : 'rgba(0, 0, 0, 0.06)',
                    },
                  ]}
                >
                  {/* Ícone da Medalha */}
                  <View style={styles.badgeWrapper}>
                    {desbloqueada ? (
                      <LinearGradient
                        colors={['#FFD700', '#FFA500']}
                        style={styles.badgeIconCircle}
                      >
                        <Ionicons name={iconName} size={28} color="#FFFFFF" />
                      </LinearGradient>
                    ) : (
                      <View
                        style={[
                          styles.badgeIconCircle,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.08)',
                          },
                        ]}
                      >
                        <Ionicons
                          name={iconName}
                          size={24}
                          color={isDark ? '#666' : '#AAA'}
                        />
                        <View style={styles.lockOverlay}>
                          <Ionicons name="lock-closed" size={11} color="#FFF" />
                        </View>
                      </View>
                    )}
                  </View>

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.achievementName,
                      { color: isDark ? '#FFFFFF' : '#1A1824' },
                    ]}
                  >
                    {conquista.nome}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.achievementDesc,
                      { color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#666380' },
                    ]}
                  >
                    {conquista.descricao}
                  </Text>

                  {/* Progresso ou Recompensa */}
                  {desbloqueada ? (
                    <View style={styles.badgeUnlockedTag}>
                      <Ionicons name="checkmark" size={12} color="#FFD700" />
                      <Text style={styles.badgeUnlockedTagText}>
                        +{conquista.recompensaXp} XP
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.badgeProgressContainer}>
                      <View style={styles.badgeProgressBar}>
                        <View
                          style={[
                            styles.badgeProgressFill,
                            { width: `${conquista.progressoPercentual}%` },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.badgeProgressText,
                          { color: isDark ? '#888' : '#888' },
                        ]}
                      >
                        {conquista.progressoAtual}/{conquista.alvo} ({conquista.progressoPercentual}%)
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal de Configuração de Metas */}
      <SetGoalModal
        visible={goalModalVisible}
        usuarioId={user?.uid || ''}
        tipoMeta={selectedGoalType}
        valorAtual={selectedGoalCurrentValue}
        onClose={() => setGoalModalVisible(false)}
        onSuccess={() => carregarDados()}
      />

      {/* Modal de Detalhes da Conquista */}
      <AchievementUnlockedModal
        visible={detailModalVisible}
        conquista={selectedAchievement}
        onClose={() => setDetailModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  titleSection: {
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  heroBarBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  heroBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  heroProgressText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  trophyWrapper: {
    alignItems: 'center',
  },
  trophyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 6,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  xpPillText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  goalCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  goalIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  goalSubtitle: {
    fontSize: 11,
  },
  achievedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  achievedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00C48C',
  },
  goalBody: {
    gap: 6,
  },
  goalProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  goalProgressNumbers: {
    fontSize: 16,
    fontWeight: '700',
  },
  goalProgressPct: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalActionBtn: {
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  goalActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C5CE7',
  },
  emptyGoalWrapper: {
    gap: 4,
    justifyContent: 'center',
    paddingTop: 2,
  },
  emptyGoalText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  setGoalEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#6C5CE7',
    borderRadius: 12,
  },
  setGoalEmptyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  reminderCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(108, 92, 231, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  reminderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  reminderTimesSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(108, 92, 231, 0.15)',
  },
  reminderTimesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  timesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: '48%',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
  },
  badgeWrapper: {
    marginBottom: 10,
  },
  badgeIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#6C5CE7',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    marginBottom: 10,
    minHeight: 30,
  },
  badgeUnlockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeUnlockedTagText: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeProgressContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  badgeProgressBar: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    overflow: 'hidden',
  },
  badgeProgressFill: {
    height: '100%',
    backgroundColor: '#6C5CE7',
    borderRadius: 3,
  },
  badgeProgressText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
