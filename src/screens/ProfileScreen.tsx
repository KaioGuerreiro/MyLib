import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { TITULOS_NIVEL } from '../utils/gamification';
import { getAvatarById } from '../utils/avatars';
import { MetricasLeitura } from '../models/EstatisticasLeitura';
import { ItemRanking } from '../models/Ranking';
import { fetchUserStats } from '../services/statsService';
import { fetchRanking, sincronizarRankingUsuario } from '../services/rankingService';

import { ReadingBarChart } from '../components/ReadingBarChart';
import { AvatarPickerModal } from '../components/AvatarPickerModal';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import { ThemeSlider } from '../components/ThemeSlider';

type AbaPerfil = 'estatisticas' | 'ranking' | 'configuracoes';

export default function ProfileScreen() {
  const { theme, isDark, toggleTheme, toggleAnim } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, userData, signOut, updateName, updateAvatar, deleteAccount } = useAuth();

  const [abaAtiva, setAbaAtiva] = useState<AbaPerfil>('estatisticas');
  const [refreshing, setRefreshing] = useState(false);

  // Dados do Módulo 5
  const [metricas, setMetricas] = useState<MetricasLeitura | null>(null);
  const [ranking, setRanking] = useState<ItemRanking[]>([]);
  const [criterioRanking, setCriterioRanking] = useState<'xp' | 'streak'>('xp');

  // Modais
  const [modalAvatarAberto, setModalAvatarAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [modalEditarNomeAberto, setModalEditarNomeAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);

  const avatarAtual = getAvatarById(userData?.avatarId);
  const tituloNivel = TITULOS_NIVEL[userData?.nivelAtual || 1] || 'Leitor Apaixonado';

  // Carrega estatísticas do usuário
  const carregarEstatisticas = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const stats = await fetchUserStats(user.uid);
      setMetricas(stats);
    } catch (err) {
      console.warn('Erro ao carregar estatísticas:', err);
    }
  }, [user]);

  // Carrega ranking social
  const carregarRanking = useCallback(async () => {
    if (!user?.uid) return;
    try {
      if (userData) {
        await sincronizarRankingUsuario(userData);
      }
      const lista = await fetchRanking(criterioRanking);
      setRanking(lista);
    } catch (err) {
      console.warn('Erro ao carregar ranking:', err);
    }
  }, [criterioRanking, user, userData]);

  const carregarTudo = useCallback(async () => {
    await Promise.all([carregarEstatisticas(), carregarRanking()]);
  }, [carregarEstatisticas, carregarRanking]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await carregarTudo();
    setRefreshing(false);
  };

  const alternarAba = (aba: AbaPerfil) => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    setAbaAtiva(aba);
  };

  const alternarCriterioRanking = (criterio: 'xp' | 'streak') => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    setCriterioRanking(criterio);
  };

  // Salvar novo nome
  const handleSalvarNome = async () => {
    if (!novoNome.trim()) return;
    try {
      setSalvandoNome(true);
      await updateName(novoNome.trim());
      setModalEditarNomeAberto(false);
      await carregarRanking();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível alterar o nome.');
    } finally {
      setSalvandoNome(false);
    }
  };

  // Salvar novo avatar
  const handleSelecionarAvatar = async (avatarId: string) => {
    try {
      await updateAvatar(avatarId);
      await carregarRanking();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível atualizar o avatar.');
    }
  };

  // Excluir conta
  const handleConfirmarExclusao = async (senha?: string) => {
    await deleteAccount(senha);
  };

  // Posicao do leitor no ranking
  const posicaoAtual = ranking.findIndex((r) => r.id === user?.uid);
  const leitorRankeado = posicaoAtual >= 0 ? ranking[posicaoAtual] : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Card de Perfil com Avatar e Título */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: isDark ? 'rgba(28, 26, 46, 0.70)' : 'rgba(255, 255, 255, 0.85)',
              borderColor: isDark ? 'rgba(145, 132, 217, 0.22)' : 'rgba(108, 92, 231, 0.15)',
            },
          ]}
        >
          {/* Avatar com Botão de Edição */}
          <Pressable
            onPress={() => setModalAvatarAberto(true)}
            style={styles.avatarWrapper}
            accessibilityLabel="Trocar Avatar do leitor"
          >
            <View style={[styles.avatarCircle, { backgroundColor: avatarAtual.fundo }]}>
              <Ionicons name={avatarAtual.icone} size={42} color={avatarAtual.cor} />
            </View>
            <View style={[styles.avatarEditBadge, { backgroundColor: theme.primary }]}>
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* Nome e Título do Leitor */}
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                {userData?.nome || 'Leitor MyLib'}
              </Text>
              <Pressable
                onPress={() => {
                  setNovoNome(userData?.nome || '');
                  setModalEditarNomeAberto(true);
                }}
                hitSlop={8}
                style={styles.editNameButton}
              >
                <Ionicons name="pencil-outline" size={16} color={theme.primary} />
              </Pressable>
            </View>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
              {userData?.email || ''}
            </Text>

            {/* Badge de Título Literário */}
            <View
              style={[
                styles.titleBadge,
                {
                  backgroundColor: isDark ? 'rgba(145, 132, 217, 0.20)' : 'rgba(108, 92, 231, 0.12)',
                  borderColor: isDark ? 'rgba(215, 210, 255, 0.35)' : 'rgba(108, 92, 231, 0.25)',
                },
              ]}
            >
              <Ionicons name="ribbon-outline" size={14} color={theme.primary} style={{ marginRight: 5 }} />
              <Text style={[styles.titleBadgeText, { color: theme.primary }]}>{tituloNivel}</Text>
            </View>
          </View>

          {/* Métricas Rápidas: XP, Nível, Ofensiva */}
          <View style={styles.statsPillRow}>
            <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }]}>
              <Ionicons name="flash" size={16} color="#F59E0B" />
              <Text style={[styles.statPillValue, { color: theme.text }]}>{userData?.xpTotal || 0}</Text>
              <Text style={[styles.statPillLabel, { color: theme.textSecondary }]}>XP Total</Text>
            </View>

            <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }]}>
              <Ionicons name="trophy" size={16} color="#8B5CF6" />
              <Text style={[styles.statPillValue, { color: theme.text }]}>Nível {userData?.nivelAtual || 1}</Text>
              <Text style={[styles.statPillLabel, { color: theme.textSecondary }]}>Patente</Text>
            </View>

            <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }]}>
              <Ionicons name="flame" size={16} color="#EF4444" />
              <Text style={[styles.statPillValue, { color: theme.text }]}>{userData?.ofensivaAtual || 0}d</Text>
              <Text style={[styles.statPillLabel, { color: theme.textSecondary }]}>Ofensiva</Text>
            </View>
          </View>
        </View>

        {/* Segmented Control de Abas */}
        <View
          style={[
            styles.tabsContainer,
            {
              backgroundColor: isDark ? 'rgba(18, 16, 31, 0.60)' : 'rgba(235, 231, 252, 0.70)',
              borderColor: isDark ? 'rgba(145, 132, 217, 0.18)' : 'rgba(108, 92, 231, 0.15)',
            },
          ]}
        >
          <Pressable
            onPress={() => alternarAba('estatisticas')}
            style={[
              styles.tabButton,
              abaAtiva === 'estatisticas' && {
                backgroundColor: isDark ? 'rgba(145, 132, 217, 0.35)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(215, 210, 255, 0.45)' : 'rgba(108, 92, 231, 0.25)',
                borderWidth: 1,
              },
            ]}
          >
            <Ionicons
              name={abaAtiva === 'estatisticas' ? 'bar-chart' : 'bar-chart-outline'}
              size={16}
              color={abaAtiva === 'estatisticas' ? theme.primary : theme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: abaAtiva === 'estatisticas' ? theme.primary : theme.textSecondary,
                  fontWeight: abaAtiva === 'estatisticas' ? '700' : '500',
                },
              ]}
            >
              Relatórios
            </Text>
          </Pressable>

          <Pressable
            onPress={() => alternarAba('ranking')}
            style={[
              styles.tabButton,
              abaAtiva === 'ranking' && {
                backgroundColor: isDark ? 'rgba(145, 132, 217, 0.35)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(215, 210, 255, 0.45)' : 'rgba(108, 92, 231, 0.25)',
                borderWidth: 1,
              },
            ]}
          >
            <Ionicons
              name={abaAtiva === 'ranking' ? 'podium' : 'podium-outline'}
              size={16}
              color={abaAtiva === 'ranking' ? theme.primary : theme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: abaAtiva === 'ranking' ? theme.primary : theme.textSecondary,
                  fontWeight: abaAtiva === 'ranking' ? '700' : '500',
                },
              ]}
            >
              Ranking
            </Text>
          </Pressable>

          <Pressable
            onPress={() => alternarAba('configuracoes')}
            style={[
              styles.tabButton,
              abaAtiva === 'configuracoes' && {
                backgroundColor: isDark ? 'rgba(145, 132, 217, 0.35)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(215, 210, 255, 0.45)' : 'rgba(108, 92, 231, 0.25)',
                borderWidth: 1,
              },
            ]}
          >
            <Ionicons
              name={abaAtiva === 'configuracoes' ? 'settings' : 'settings-outline'}
              size={16}
              color={abaAtiva === 'configuracoes' ? theme.primary : theme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  color: abaAtiva === 'configuracoes' ? theme.primary : theme.textSecondary,
                  fontWeight: abaAtiva === 'configuracoes' ? '700' : '500',
                },
              ]}
            >
              Ajustes
            </Text>
          </Pressable>
        </View>

        {/* CONTEÚDO DA ABA 1: ESTATÍSTICAS E GRÁFICOS [RF009] */}
        {abaAtiva === 'estatisticas' && (
          <View style={styles.sectionContainer}>
            {/* Gráfico Semanal */}
            {metricas && <ReadingBarChart dadosSemanais={metricas.leituraSemanal} />}

            {/* Grid de Métricas Consolidadas */}
            <View style={styles.kpiGrid}>
              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: isDark ? 'rgba(28, 26, 46, 0.70)' : 'rgba(255, 255, 255, 0.85)',
                    borderColor: isDark ? 'rgba(145, 132, 217, 0.20)' : 'rgba(108, 92, 231, 0.12)',
                  },
                ]}
              >
                <View style={[styles.kpiIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Ionicons name="book" size={20} color="#3B82F6" />
                </View>
                <Text style={[styles.kpiValue, { color: theme.text }]}>
                  {metricas?.totalPaginasLidas || 0}
                </Text>
                <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Páginas Lidas</Text>
              </View>

              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: isDark ? 'rgba(28, 26, 46, 0.70)' : 'rgba(255, 255, 255, 0.85)',
                    borderColor: isDark ? 'rgba(145, 132, 217, 0.20)' : 'rgba(108, 92, 231, 0.12)',
                  },
                ]}
              >
                <View style={[styles.kpiIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="time" size={20} color="#10B981" />
                </View>
                <Text style={[styles.kpiValue, { color: theme.text }]}>
                  {metricas?.totalMinutosLidos || 0}
                </Text>
                <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Minutos Dedicados</Text>
              </View>

              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: isDark ? 'rgba(28, 26, 46, 0.70)' : 'rgba(255, 255, 255, 0.85)',
                    borderColor: isDark ? 'rgba(145, 132, 217, 0.20)' : 'rgba(108, 92, 231, 0.12)',
                  },
                ]}
              >
                <View style={[styles.kpiIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="checkmark-done-circle" size={20} color="#F59E0B" />
                </View>
                <Text style={[styles.kpiValue, { color: theme.text }]}>
                  {metricas?.totalLivrosConcluidos || 0}
                </Text>
                <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Livros Lidos</Text>
              </View>

              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: isDark ? 'rgba(28, 26, 46, 0.70)' : 'rgba(255, 255, 255, 0.85)',
                    borderColor: isDark ? 'rgba(145, 132, 217, 0.20)' : 'rgba(108, 92, 231, 0.12)',
                  },
                ]}
              >
                <View style={[styles.kpiIcon, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                  <Ionicons name="star" size={20} color="#EC4899" />
                </View>
                <Text style={[styles.kpiValue, { color: theme.text }]}>
                  {metricas?.diaMaisProdutivo || '—'}
                </Text>
                <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Mais Produtivo</Text>
              </View>
            </View>

            {/* Média Semanal de Produtividade */}
            <View
              style={[
                styles.highlightCard,
                {
                  backgroundColor: isDark ? 'rgba(145, 132, 217, 0.12)' : 'rgba(108, 92, 231, 0.08)',
                  borderColor: isDark ? 'rgba(215, 210, 255, 0.25)' : 'rgba(108, 92, 231, 0.18)',
                },
              ]}
            >
              <Ionicons name="analytics-outline" size={22} color={theme.primary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.highlightTitle, { color: theme.text }]}>Consistência Semanal</Text>
                <Text style={[styles.highlightDesc, { color: theme.textSecondary }]}>
                  Você leu em <Text style={{ fontWeight: '700', color: theme.primary }}>{metricas?.diasLidosNaSemana || 0} de 7 dias</Text>,
                  com média de <Text style={{ fontWeight: '700', color: theme.primary }}>{metricas?.mediaPaginasPorDiaSemana || 0} páginas/dia</Text>.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* CONTEÚDO DA ABA 2: RANKING E SOCIAL */}
        {abaAtiva === 'ranking' && (
          <View style={styles.sectionContainer}>
            {/* Seletor de Critério: XP vs Ofensiva */}
            <View
              style={[
                styles.criterioContainer,
                {
                  backgroundColor: isDark ? 'rgba(28, 26, 46, 0.70)' : 'rgba(255, 255, 255, 0.85)',
                  borderColor: isDark ? 'rgba(145, 132, 217, 0.20)' : 'rgba(108, 92, 231, 0.15)',
                },
              ]}
            >
              <Pressable
                onPress={() => alternarCriterioRanking('xp')}
                style={[
                  styles.criterioButton,
                  criterioRanking === 'xp' && {
                    backgroundColor: isDark ? 'rgba(145, 132, 217, 0.35)' : theme.primary,
                  },
                ]}
              >
                <Ionicons
                  name="flash"
                  size={14}
                  color={criterioRanking === 'xp' ? '#FFFFFF' : theme.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.criterioText,
                    { color: criterioRanking === 'xp' ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  XP Total
                </Text>
              </Pressable>

              <Pressable
                onPress={() => alternarCriterioRanking('streak')}
                style={[
                  styles.criterioButton,
                  criterioRanking === 'streak' && {
                    backgroundColor: isDark ? 'rgba(145, 132, 217, 0.35)' : theme.primary,
                  },
                ]}
              >
                <Ionicons
                  name="flame"
                  size={14}
                  color={criterioRanking === 'streak' ? '#FFFFFF' : theme.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.criterioText,
                    { color: criterioRanking === 'streak' ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  Ofensiva (Dias)
                </Text>
              </Pressable>
            </View>

            {/* Posição do Usuário Atual em Destaque */}
            {leitorRankeado && (
              <View
                style={[
                  styles.myRankCard,
                  {
                    backgroundColor: isDark ? 'rgba(145, 132, 217, 0.25)' : 'rgba(108, 92, 231, 0.12)',
                    borderColor: theme.primary,
                  },
                ]}
              >
                <View style={styles.rankBadge}>
                  <Text style={[styles.rankBadgeNumber, { color: theme.primary }]}>
                    #{leitorRankeado.posicao}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.myRankTitle, { color: theme.text }]}>Sua Posição no Ranking</Text>
                  <Text style={[styles.myRankSubtitle, { color: theme.textSecondary }]}>
                    {criterioRanking === 'xp'
                      ? `${leitorRankeado.xpTotal} XP conquistados`
                      : `${leitorRankeado.ofensivaAtual} dias de ofensiva mantida`}
                  </Text>
                </View>
                <Ionicons name="ribbon" size={24} color={theme.primary} />
              </View>
            )}

            {/* Pódio Top 3 */}
            {ranking.length >= 3 && (
              <View style={styles.podiumContainer}>
                {/* 2º Lugar (Prata) */}
                <View style={[styles.podiumColumn, { height: 130 }]}>
                  <View style={[styles.podiumAvatar, { backgroundColor: getAvatarById(ranking[1]?.avatarId).fundo }]}>
                    <Ionicons
                      name={getAvatarById(ranking[1]?.avatarId).icone}
                      size={24}
                      color={getAvatarById(ranking[1]?.avatarId).cor}
                    />
                  </View>
                  <Text numberOfLines={1} style={[styles.podiumName, { color: theme.text }]}>
                    {ranking[1]?.nome}
                  </Text>
                  <Text style={styles.podiumScore}>
                    {criterioRanking === 'xp' ? `${ranking[1]?.xpTotal} XP` : `${ranking[1]?.ofensivaAtual}d`}
                  </Text>
                  <View style={[styles.podiumStep, { backgroundColor: '#94A3B8' }]}>
                    <Text style={styles.podiumStepText}>2</Text>
                  </View>
                </View>

                {/* 1º Lugar (Ouro) */}
                <View style={[styles.podiumColumn, { height: 160 }]}>
                  <Ionicons name="trophy" size={24} color="#F59E0B" style={{ marginBottom: 4 }} />
                  <View style={[styles.podiumAvatar, { backgroundColor: getAvatarById(ranking[0]?.avatarId).fundo, width: 50, height: 50, borderRadius: 25 }]}>
                    <Ionicons
                      name={getAvatarById(ranking[0]?.avatarId).icone}
                      size={28}
                      color={getAvatarById(ranking[0]?.avatarId).cor}
                    />
                  </View>
                  <Text numberOfLines={1} style={[styles.podiumName, { color: theme.text, fontWeight: '700' }]}>
                    {ranking[0]?.nome}
                  </Text>
                  <Text style={[styles.podiumScore, { color: '#F59E0B', fontWeight: '700' }]}>
                    {criterioRanking === 'xp' ? `${ranking[0]?.xpTotal} XP` : `${ranking[0]?.ofensivaAtual}d`}
                  </Text>
                  <View style={[styles.podiumStep, { backgroundColor: '#F59E0B', height: 60 }]}>
                    <Text style={styles.podiumStepText}>1</Text>
                  </View>
                </View>

                {/* 3º Lugar (Bronze) */}
                <View style={[styles.podiumColumn, { height: 110 }]}>
                  <View style={[styles.podiumAvatar, { backgroundColor: getAvatarById(ranking[2]?.avatarId).fundo }]}>
                    <Ionicons
                      name={getAvatarById(ranking[2]?.avatarId).icone}
                      size={24}
                      color={getAvatarById(ranking[2]?.avatarId).cor}
                    />
                  </View>
                  <Text numberOfLines={1} style={[styles.podiumName, { color: theme.text }]}>
                    {ranking[2]?.nome}
                  </Text>
                  <Text style={styles.podiumScore}>
                    {criterioRanking === 'xp' ? `${ranking[2]?.xpTotal} XP` : `${ranking[2]?.ofensivaAtual}d`}
                  </Text>
                  <View style={[styles.podiumStep, { backgroundColor: '#D97706' }]}>
                    <Text style={styles.podiumStepText}>3</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Lista dos demais participantes */}
            <View style={styles.rankingList}>
              {ranking.map((item) => {
                const isMe = item.id === user?.uid;
                const avatar = getAvatarById(item.avatarId);

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.rankRow,
                      {
                        backgroundColor: isMe
                          ? isDark
                            ? 'rgba(145, 132, 217, 0.28)'
                            : 'rgba(108, 92, 231, 0.15)'
                          : isDark
                          ? 'rgba(28, 26, 46, 0.70)'
                          : 'rgba(255, 255, 255, 0.85)',
                        borderColor: isMe
                          ? theme.primary
                          : isDark
                          ? 'rgba(145, 132, 217, 0.15)'
                          : 'rgba(108, 92, 231, 0.10)',
                      },
                    ]}
                  >
                    <View style={styles.rankPositionBadge}>
                      <Text
                        style={[
                          styles.rankPositionText,
                          {
                            color: item.posicao === 1
                              ? '#F59E0B'
                              : item.posicao === 2
                              ? '#94A3B8'
                              : item.posicao === 3
                              ? '#D97706'
                              : theme.textSecondary,
                            fontWeight: (item.posicao || 0) <= 3 ? '700' : '600',
                          },
                        ]}
                      >
                        {item.posicao}º
                      </Text>
                    </View>

                    <View style={[styles.rankRowAvatar, { backgroundColor: avatar.fundo }]}>
                      <Ionicons name={avatar.icone} size={18} color={avatar.cor} />
                    </View>

                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.rankRowName,
                          { color: theme.text, fontWeight: isMe ? '700' : '600' },
                        ]}
                      >
                        {item.nome} {isMe && '(Você)'}
                      </Text>
                      <Text style={[styles.rankRowSubtitle, { color: theme.textSecondary }]}>
                        Nível {item.nivelAtual} • {TITULOS_NIVEL[item.nivelAtual] || 'Leitor'}
                      </Text>
                    </View>

                    <View style={styles.rankRowScoreContainer}>
                      <Text style={[styles.rankRowScore, { color: theme.primary }]}>
                        {criterioRanking === 'xp' ? `${item.xpTotal} XP` : `${item.ofensivaAtual} dias`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* CONTEÚDO DA ABA 3: AJUSTES, TEMA E CONTA */}
        {abaAtiva === 'configuracoes' && (
          <View style={styles.sectionContainer}>
            {/* Bloco de Aparência */}
            <View
              style={[
                styles.configCard,
                {
                  backgroundColor: isDark ? 'rgba(28, 26, 46, 0.70)' : 'rgba(255, 255, 255, 0.85)',
                  borderColor: isDark ? 'rgba(145, 132, 217, 0.20)' : 'rgba(108, 92, 231, 0.12)',
                },
              ]}
            >
              <Text style={[styles.configSectionTitle, { color: theme.text }]}>Aparência</Text>
              <View style={styles.themeToggleRow}>
                <View>
                  <Text style={[styles.configLabel, { color: theme.text }]}>Tema do Aplicativo</Text>
                  <Text style={[styles.configSublabel, { color: theme.textSecondary }]}>
                    Alternar entre Modo Claro e Escuro
                  </Text>
                </View>
                <ThemeSlider isDark={isDark} onToggle={toggleTheme} anim={toggleAnim} />
              </View>
            </View>

            {/* Informações Acadêmicas do TCC */}
            <View
              style={[
                styles.configCard,
                {
                  backgroundColor: isDark ? 'rgba(28, 26, 46, 0.70)' : 'rgba(255, 255, 255, 0.85)',
                  borderColor: isDark ? 'rgba(145, 132, 217, 0.20)' : 'rgba(108, 92, 231, 0.12)',
                },
              ]}
            >
              <Text style={[styles.configSectionTitle, { color: theme.text }]}>Sobre o MyLib</Text>
              <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
                Trabalho de Conclusão de Curso (TCC II) desenvolvido para o curso de Bacharelado em Engenharia de Software da UNIGRAN.
              </Text>
              <View style={styles.aboutMetaRow}>
                <Text style={[styles.aboutMetaLabel, { color: theme.textSecondary }]}>Autor:</Text>
                <Text style={[styles.aboutMetaValue, { color: theme.text }]}>Kaio Rodrigo Guerreiro Gomes</Text>
              </View>
              <View style={styles.aboutMetaRow}>
                <Text style={[styles.aboutMetaLabel, { color: theme.textSecondary }]}>Orientador:</Text>
                <Text style={[styles.aboutMetaValue, { color: theme.text }]}>Prof. M.Sc. Ezéfferth Fernandes</Text>
              </View>
              <View style={styles.aboutMetaRow}>
                <Text style={[styles.aboutMetaLabel, { color: theme.textSecondary }]}>Versão:</Text>
                <Text style={[styles.aboutMetaValue, { color: theme.text }]}>1.0.0 (Expo SDK 57)</Text>
              </View>
            </View>

            {/* Ações de Conta: Sair e Excluir Conta */}
            <View
              style={[
                styles.configCard,
                {
                  backgroundColor: isDark ? 'rgba(28, 26, 46, 0.70)' : 'rgba(255, 255, 255, 0.85)',
                  borderColor: isDark ? 'rgba(145, 132, 217, 0.20)' : 'rgba(108, 92, 231, 0.12)',
                },
              ]}
            >
              <Text style={[styles.configSectionTitle, { color: theme.text }]}>Gestão da Conta</Text>

              {/* Botão Sair da Conta */}
              <Pressable
                onPress={async () => {
                  if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  await signOut();
                }}
                style={styles.actionRow}
              >
                <View style={styles.actionLeft}>
                  <Ionicons name="log-out-outline" size={20} color={theme.text} />
                  <Text style={[styles.actionText, { color: theme.text }]}>Sair da Conta</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]} />

              {/* Botão Excluir Conta (LGPD) */}
              <Pressable
                onPress={() => setModalExcluirAberto(true)}
                style={styles.actionRow}
              >
                <View style={styles.actionLeft}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={[styles.actionText, { color: '#EF4444', fontWeight: '600' }]}>
                    Excluir Minha Conta (LGPD)
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#EF4444" />
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal de Escolha de Avatar */}
      <AvatarPickerModal
        visible={modalAvatarAberto}
        onClose={() => setModalAvatarAberto(false)}
        avatarSelecionadoId={userData?.avatarId}
        onSelectAvatar={handleSelecionarAvatar}
      />

      {/* Modal de Exclusão Definitiva de Conta */}
      <DeleteAccountModal
        visible={modalExcluirAberto}
        onClose={() => setModalExcluirAberto(false)}
        onConfirmDelete={handleConfirmarExclusao}
      />

      {/* Modal para Editar Nome do Leitor */}
      <Modal
        visible={modalEditarNomeAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalEditarNomeAberto(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Desfoque Apple nativo no backdrop */}
          <BlurView
            intensity={Platform.OS === 'ios' ? 25 : 35}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalEditarNomeAberto(false)} />
          <View
            style={[
              styles.editNameModalCard,
              {
                backgroundColor: isDark ? 'rgba(28, 26, 46, 0.96)' : 'rgba(255, 255, 255, 0.98)',
                borderColor: isDark ? 'rgba(145, 132, 217, 0.30)' : 'rgba(108, 92, 231, 0.20)',
                borderTopColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.95)',
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Editar Nome de Exibição</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Como você deseja ser chamado na estante e no ranking?
            </Text>

            <TextInput
              value={novoNome}
              onChangeText={setNovoNome}
              placeholder="Digite seu nome"
              placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)'}
              style={[
                styles.editNameInput,
                {
                  color: theme.text,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                  borderColor: isDark ? 'rgba(145, 132, 217, 0.25)' : 'rgba(108, 92, 231, 0.20)',
                },
              ]}
              autoFocus
              maxLength={40}
            />

            <View style={styles.modalButtonsRow}>
              <Pressable
                onPress={() => setModalEditarNomeAberto(false)}
                style={[
                  styles.modalCancelBtn,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
                ]}
              >
                <Text style={[styles.modalCancelText, { color: theme.text }]}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={handleSalvarNome}
                disabled={salvandoNome}
                style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
              >
                {salvandoNome ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Salvar Nome</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  profileCard: {
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nameContainer: {
    alignItems: 'center',
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  editNameButton: {
    padding: 4,
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  titleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsPillRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    gap: 2,
  },
  statPillValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  statPillLabel: {
    fontSize: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    marginVertical: 14,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabButtonText: {
    fontSize: 12,
  },
  sectionContainer: {
    gap: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48.5%',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  kpiIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  kpiLabel: {
    fontSize: 11,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  highlightDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  criterioContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 10,
  },
  criterioButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  criterioText: {
    fontSize: 12,
    fontWeight: '600',
  },
  myRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 12,
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  rankBadgeNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  myRankTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  myRankSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 10,
    marginVertical: 14,
    paddingHorizontal: 8,
  },
  podiumColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  podiumAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  podiumName: {
    fontSize: 11,
    textAlign: 'center',
    width: '100%',
  },
  podiumScore: {
    fontSize: 10,
    marginTop: 2,
    marginBottom: 6,
  },
  podiumStep: {
    width: '100%',
    height: 46,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumStepText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  rankingList: {
    gap: 8,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  rankPositionBadge: {
    width: 32,
    alignItems: 'center',
  },
  rankPositionText: {
    fontSize: 13,
  },
  rankRowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankRowName: {
    fontSize: 13,
  },
  rankRowSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },
  rankRowScoreContainer: {
    alignItems: 'flex-end',
  },
  rankRowScore: {
    fontSize: 12,
    fontWeight: '700',
  },
  configCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  configSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  themeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  configSublabel: {
    fontSize: 11,
    marginTop: 2,
  },
  aboutText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  aboutMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  aboutMetaLabel: {
    fontSize: 12,
  },
  aboutMetaValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionText: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editNameModalCard: {
    width: '100%',
    borderRadius: 28,
    borderCurve: 'continuous',
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.30,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 12.5,
    marginBottom: 16,
    lineHeight: 16,
  },
  editNameInput: {
    height: 50,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 18,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 24,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
