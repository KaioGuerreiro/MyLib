import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ThemeSlider } from '../components/ThemeSlider';
import { ThemeType } from '../theme/colors';
import { sendVerificationEmail } from '../services/authService';
import {
  ItemEstanteCompleto,
  subscribeToUserBookshelf,
} from '../services/bookshelfService';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Cores suaves de capa caso o livro não possua urlCapa
const COVER_COLORS = [
  '#2C2B4E',
  '#1F3238',
  '#352B44',
  '#2A3A2A',
  '#382C24',
  '#243340',
];

export default function HomeScreen() {
  const { isDark, theme, toggleTheme, toggleAnim } = useTheme();
  const { user, userData, signOut, refreshUserProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const s = makeStyles(theme);

  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const [sendingVerification, setSendingVerification] = useState(false);
  const [estante, setEstante] = useState<ItemEstanteCompleto[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Informações 100% dinâmicas do usuário vindas do Firestore
  const fullName = userData?.nome || user?.displayName || user?.email?.split('@')[0] || 'Leitor';
  const firstName = fullName.trim().split(' ')[0];
  const ofensivaDias = userData?.ofensivaAtual ?? 0;
  const nivelAtual = userData?.nivelAtual ?? 1;
  const xpTotal = userData?.xpTotal ?? 0;

  // Inscrição em tempo real na subcoleção de estante do usuário no Firestore
  useEffect(() => {
    if (!user?.uid) {
      setEstante([]);
      setLoadingBooks(false);
      return;
    }

    setLoadingBooks(true);

    const unsubscribe = subscribeToUserBookshelf(
      user.uid,
      (firestoreItems) => {
        setEstante(firestoreItems);
        setLoadingBooks(false);
      },
      () => {
        setLoadingBooks(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Livro atualmente com status 'LENDO' no Firestore
  const currentReading = useMemo(() => {
    return estante.find((item) => item.status === 'LENDO') || null;
  }, [estante]);

  // Cálculo de progresso do livro atual
  const readingStats = useMemo(() => {
    if (!currentReading) return null;
    const paginasLidas = currentReading.progressoPaginas || 0;
    const totalPaginas = Math.max(1, currentReading.livro.totalPaginas || 1);
    const percent = Math.min(100, Math.round((paginasLidas / totalPaginas) * 100));

    return {
      paginasLidas,
      totalPaginas,
      percent,
      titulo: currentReading.livro.titulo,
      autor: currentReading.livro.autor,
      urlCapa: currentReading.livro.urlCapa,
    };
  }, [currentReading]);

  // Iniciais do nome para o avatar do topo
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUserProfile();
    } catch (err) {
      // Falha silenciosa para evitar leak de informações sensíveis no console
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sair da Conta',
      'Deseja encerrar sua sessão no MyLib?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };

  const handleResendVerification = async () => {
    if (!user || sendingVerification) return;
    setSendingVerification(true);
    try {
      await sendVerificationEmail(user);
      Alert.alert('E-mail Enviado!', `Enviamos o e-mail de verificação para ${user.email}.`);
    } catch {
      Alert.alert('Atenção', 'Não foi possível reenviar o e-mail no momento. Tente novamente mais tarde.');
    } finally {
      setSendingVerification(false);
    }
  };

  const handleContinueReading = () => {
    if (!currentReading) return;
    Alert.alert(
      'Sessão de Leitura',
      `O registro de progresso para "${currentReading.livro.titulo}" será implementado no módulo de sessões.`,
      [{ text: 'OK' }]
    );
  };

  const getStatusBadgeStyle = (status: string) => {
    const norm = status.replace('_', ' ').toUpperCase();
    switch (norm) {
      case 'LIDO':
        return {
          bg: theme.success + '25',
          border: theme.success + '60',
          text: theme.success,
          label: 'LIDO',
        };
      case 'NA FILA':
        return {
          bg: theme.warning + '25',
          border: theme.warning + '60',
          text: theme.warning,
          label: 'NA FILA',
        };
      case 'LENDO':
      default:
        return {
          bg: theme.accent + '25',
          border: theme.accent + '60',
          text: theme.accentText,
          label: 'LENDO',
        };
    }
  };

  return (
    <View style={[s.safe, { paddingTop: insets.top }]}>
      <StatusBar style={theme.statusBar} />

      {/* Blobs decorativos de fundo */}
      <View style={[s.blob, s.blobTopLeft]} />
      <View style={[s.blob, s.blobBottomRight]} />

      {/* Conteúdo rolável vertical da Home */}
      <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
        >
          {/* 1. Header do Usuário (Top Bar) */}
          <View style={s.topBarCard}>
            <TouchableOpacity
              style={s.userProfileRow}
              onPress={handleSignOut}
              activeOpacity={0.8}
              accessibilityLabel="Opções de perfil e logout"
            >
              <View style={s.avatarContainer}>
                <Text style={s.avatarInitials}>{getInitials(fullName)}</Text>
              </View>
              <View style={s.userInfoText}>
                <Text style={s.userName} numberOfLines={1}>
                  {fullName}
                </Text>
                <Text style={s.userBadgeSubtitle}>Leitor Nível {nivelAtual}</Text>
              </View>
            </TouchableOpacity>

            <View style={s.topBarRight}>
              <View style={s.streakBadgeTop}>
                <Text style={s.streakBadgeText}>{ofensivaDias} 🔥</Text>
              </View>
              <View style={s.themeSliderWrapper}>
                <ThemeSlider isDark={isDark} onToggle={toggleTheme} anim={toggleAnim} />
              </View>
            </View>
          </View>

          {/* Banner de Verificação de E-mail se não verificado */}
          {user && !user.emailVerified && (
            <TouchableOpacity
              style={s.verifyBanner}
              onPress={handleResendVerification}
              disabled={sendingVerification}
              activeOpacity={0.8}
            >
              <Ionicons name="mail-unread-outline" size={18} color={theme.warning} style={{ marginRight: 8 }} />
              <Text style={s.verifyBannerText}>
                {sendingVerification ? 'Enviando e-mail...' : 'E-mail não verificado. Clique para reenviar!'}
              </Text>
            </TouchableOpacity>
          )}

          {/* 2. Saudação (Greeting Section) */}
          <View style={s.greetingSection}>
            <Text style={s.greetingTitle}>Olá, {firstName} 👋</Text>
            <Text style={s.greetingSubtitle}>Pronto para continuar sua jornada?</Text>
          </View>

          {/* 3. Cards de Gamificação / Status (Grid 2 Colunas) */}
          <View style={s.gamificationGrid}>
            {/* Card Ofensiva (Esquerda) */}
            <View style={[s.statCard, s.statCardStreak]}>
              <View style={[s.statIconCircle, { backgroundColor: theme.streak + '25' }]}>
                <Ionicons name="flame" size={22} color={theme.streak} />
              </View>
              <View style={s.statTextCol}>
                <Text style={s.statValue}>{ofensivaDias} dias</Text>
                <Text style={s.statLabel}>Ofensiva</Text>
              </View>
            </View>

            {/* Card Nível / XP (Direita) */}
            <View style={[s.statCard, s.statCardLevel]}>
              <View style={[s.statIconCircle, { backgroundColor: theme.accent + '25' }]}>
                <Ionicons name="star" size={20} color={theme.accent} />
              </View>
              <View style={s.statTextCol}>
                <Text style={[s.statValue, { color: theme.accent }]}>Nível {nivelAtual}</Text>
                <Text style={[s.statLabel, { color: theme.accentText }]}>{xpTotal} XP</Text>
              </View>
            </View>
          </View>

          {/* 4. Card de Leitura Atual ("Lendo Agora") */}
          {loadingBooks ? (
            <View style={s.readingCardSkeleton}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={s.loadingText}>Carregando leitura atual...</Text>
            </View>
          ) : readingStats ? (
            /* Card com livro real em leitura */
            <LinearGradient 
              colors={[theme.card, theme.bg]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.currentReadingCard}
            >
              <View style={s.readingCardBgDeco} />

              <View style={s.readingTagBadge}>
                <Text style={s.readingTagText}>LENDO AGORA</Text>
              </View>

              <View style={s.readingMainInfo}>
                <View style={s.readingBookCoverMini}>
                  {readingStats.urlCapa ? (
                    <Image source={{ uri: readingStats.urlCapa }} style={s.coverImageMini} resizeMode="cover" />
                  ) : (
                    <Ionicons name="book" size={24} color={theme.accentText} />
                  )}
                </View>
                <View style={s.readingTextInfo}>
                  <Text style={s.readingBookTitle} numberOfLines={2}>
                    {readingStats.titulo}
                  </Text>
                  <Text style={s.readingBookAuthor}>{readingStats.autor}</Text>
                </View>
              </View>

              <View style={s.progressRow}>
                <Text style={s.progressPercentText}>{readingStats.percent}% Concluído</Text>
                <Text style={s.progressPagesText}>
                  {readingStats.paginasLidas}/{readingStats.totalPaginas} pág.
                </Text>
              </View>

              <View style={s.progressBarTrack}>
                <View
                  style={[
                    s.progressBarFill,
                    { width: `${readingStats.percent}%`, backgroundColor: theme.streak },
                  ]}
                />
              </View>

              <TouchableOpacity
                style={s.continueReadingButton}
                onPress={handleContinueReading}
                activeOpacity={0.85}
                accessibilityLabel="Continuar leitura"
                id="btn-continue-reading"
              >
                <Ionicons name="book-outline" size={18} color={theme.bg} style={{ marginRight: 8 }} />
                <Text style={s.continueReadingButtonText}>Continuar Leitura</Text>
              </TouchableOpacity>
            </LinearGradient>
          ) : (
            /* Estado Vazio Dinâmico: Nenhum livro com status LENDO no banco */
            <View style={s.emptyReadingCard}>
              <View style={s.readingTagBadge}>
                <Text style={s.readingTagText}>LEITURA ATUAL</Text>
              </View>

              <View style={s.emptyReadingContent}>
                <View style={s.emptyReadingIconCircle}>
                  <Ionicons name="book-outline" size={28} color={theme.accentText} />
                </View>
                <Text style={s.emptyReadingTitle}>Nenhum livro em leitura no momento</Text>
                <Text style={s.emptyReadingSubtitle}>
                  Adicione um livro à sua estante para começar a registrar suas sessões e acompanhar o progresso.
                </Text>

                <TouchableOpacity
                  style={s.exploreButton}
                  onPress={() => navigation.navigate('Busca')}
                  activeOpacity={0.85}
                  accessibilityLabel="Buscar livros"
                  id="btn-explore-books"
                >
                  <Ionicons name="search" size={16} color={theme.bg} style={{ marginRight: 6 }} />
                  <Text style={s.exploreButtonText}>Buscar Livros</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 5. Seção "Sua Estante" */}
          <View style={s.bookshelfHeader}>
            <Text style={s.bookshelfTitle}>Sua Estante</Text>
            {estante.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Biblioteca')}
                accessibilityLabel="Ver todos os livros da estante"
                id="btn-see-all-shelf"
              >
                <Text style={s.bookshelfSeeAll}>Ver Tudo ({estante.length})</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingBooks ? (
            <View style={s.bookshelfLoading}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={s.bookshelfLoadingText}>Carregando sua estante do banco de dados...</Text>
            </View>
          ) : estante.length === 0 ? (
            /* Estado Vazio Dinâmico da Estante */
            <View style={s.bookshelfEmptyCard}>
              <View style={s.emptyShelfIconCircle}>
                <Ionicons name="library-outline" size={32} color={theme.accent} />
              </View>
              <Text style={s.bookshelfEmptyTitle}>Nenhum livro na estante</Text>
              <Text style={s.bookshelfEmptySubtitle}>
                Sua estante ainda não possui livros cadastrados no banco de dados.
              </Text>
              <TouchableOpacity
                style={s.addFirstBookButton}
                onPress={() => navigation.navigate('Busca')}
                activeOpacity={0.85}
                accessibilityLabel="Adicionar primeiro livro"
                id="btn-add-first-book"
              >
                <Ionicons name="add" size={18} color={theme.bg} style={{ marginRight: 4 }} />
                <Text style={s.addFirstBookButtonText}>Adicionar Livro</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Carrossel de Livros Reais da Estante */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.bookshelfScroll}
            >
              {estante.map((item, index) => {
                const badgeStyle = getStatusBadgeStyle(item.status);
                const coverBg = COVER_COLORS[index % COVER_COLORS.length];

                return (
                  <TouchableOpacity
                    key={item.id || item.livroId || index}
                    style={s.bookCard}
                    activeOpacity={0.8}
                  >
                    <View style={[s.bookCover, { backgroundColor: coverBg }]}>
                      {item.livro.urlCapa ? (
                        <Image source={{ uri: item.livro.urlCapa }} style={s.coverImageFull} resizeMode="cover" />
                      ) : null}

                      {/* Badge sobre a capa */}
                      <View
                        style={[
                          s.bookStatusBadge,
                          {
                            backgroundColor: badgeStyle.bg,
                            borderColor: badgeStyle.border,
                          },
                        ]}
                      >
                        <Text style={[s.bookStatusText, { color: badgeStyle.text }]}>
                          {badgeStyle.label}
                        </Text>
                      </View>

                      {!item.livro.urlCapa && (
                        <View style={s.bookCoverCenter}>
                          <Ionicons name="book-outline" size={28} color={theme.accentText} />
                        </View>
                      )}

                      <Text style={s.bookCoverPages}>{item.livro.totalPaginas}p</Text>
                    </View>

                    <Text style={s.bookTitle} numberOfLines={1}>
                      {item.livro.titulo}
                    </Text>
                    <Text style={s.bookAuthor} numberOfLines={1}>
                      {item.livro.autor}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </ScrollView>

    </View>
  );
}

function makeStyles(t: ThemeType) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: t.bg,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },

    /* Blobs */
    blob: {
      position: 'absolute',
      borderRadius: 999,
      opacity: 0.12,
    },
    blobTopLeft: {
      top: -80,
      left: -80,
      width: 260,
      height: 260,
      backgroundColor: t.blobLeft,
    },
    blobBottomRight: {
      bottom: -60,
      right: -60,
      width: 220,
      height: 220,
      backgroundColor: t.blobRight,
    },

    /* 1. Header do Usuário */
    topBarCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      marginBottom: 20,
      backgroundColor: 'transparent',
    },
    userProfileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 8,
    },
    avatarContainer: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: t.warning + '25',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: t.warning + '50',
      marginRight: 10,
    },
    avatarInitials: {
      color: t.warning,
      fontSize: 15,
      fontWeight: '800',
    },
    userInfoText: {
      flex: 1,
    },
    userName: {
      color: t.text,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    userBadgeSubtitle: {
      color: t.textSecondary,
      fontSize: 11,
      marginTop: 2,
      fontWeight: '500',
    },
    topBarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    streakBadgeTop: {
      backgroundColor: t.streak + '20',
      borderColor: t.streak + '40',
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    streakBadgeText: {
      color: t.streak,
      fontSize: 13,
      fontWeight: '800',
    },
    themeSliderWrapper: {
      transform: [{ scale: 0.82 }],
      marginRight: -6,
    },

    /* Email Verification */
    verifyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(224, 165, 78, 0.15)',
      borderColor: 'rgba(224, 165, 78, 0.3)',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
    },
    verifyBannerText: {
      color: t.warning,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },

    /* 2. Saudação */
    greetingSection: {
      marginBottom: 18,
    },
    greetingTitle: {
      color: t.text,
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    greetingSubtitle: {
      color: t.textSecondary,
      fontSize: 14,
      marginTop: 4,
      fontWeight: '500',
    },

    /* 3. Gamification Grid */
    gamificationGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    statCardStreak: {
      backgroundColor: t.streak + '15',
    },
    statCardLevel: {
      backgroundColor: t.accent + '15',
    },
    statIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    statTextCol: {
      flex: 1,
    },
    statValue: {
      color: t.text,
      fontSize: 15,
      fontWeight: '800',
    },
    statLabel: {
      color: t.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },

    /* 4. Card Leitura Atual */
    readingCardSkeleton: {
      backgroundColor: t.card,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: t.cardBorder,
      marginBottom: 24,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    loadingText: {
      color: t.textSecondary,
      fontSize: 13,
    },
    currentReadingCard: {
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: t.cardBorder,
      marginBottom: 24,
      position: 'relative',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 8,
    },
    readingCardBgDeco: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: t.accent,
      opacity: 0.08,
    },
    readingTagBadge: {
      alignSelf: 'flex-start',
      backgroundColor: t.accent + '25',
      borderColor: t.accent + '40',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    readingTagText: {
      color: t.accentText,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    readingMainInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 14,
      marginBottom: 14,
    },
    readingBookCoverMini: {
      width: 48,
      height: 68,
      borderRadius: 8,
      backgroundColor: t.accent + '20',
      borderWidth: 1,
      borderColor: t.accent + '40',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      overflow: 'hidden',
    },
    coverImageMini: {
      width: '100%',
      height: '100%',
    },
    readingTextInfo: {
      flex: 1,
    },
    readingBookTitle: {
      color: t.text,
      fontSize: 17,
      fontWeight: '800',
      lineHeight: 22,
    },
    readingBookAuthor: {
      color: t.textSecondary,
      fontSize: 13,
      marginTop: 4,
      fontWeight: '500',
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    progressPercentText: {
      color: t.text,
      fontSize: 13,
      fontWeight: '700',
    },
    progressPagesText: {
      color: t.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    progressBarTrack: {
      height: 12,
      backgroundColor: t.inputBg,
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 20,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 6,
    },
    continueReadingButton: {
      backgroundColor: t.primary,
      borderRadius: 999,
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: t.primaryShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
    continueReadingButtonText: {
      color: t.bg,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.3,
    },

    /* Estado Vazio do Card Lendo Agora */
    emptyReadingCard: {
      backgroundColor: 'transparent',
      borderRadius: 20,
      padding: 20,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: t.cardBorder,
      marginBottom: 24,
    },
    emptyReadingContent: {
      alignItems: 'center',
      paddingVertical: 14,
    },
    emptyReadingIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: t.accent + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: t.accent + '35',
    },
    emptyReadingTitle: {
      color: t.text,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 6,
    },
    emptyReadingSubtitle: {
      color: t.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: 12,
      marginBottom: 16,
    },
    exploreButton: {
      backgroundColor: t.primary,
      borderRadius: 999,
      height: 42,
      paddingHorizontal: 22,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    exploreButtonText: {
      color: t.bg,
      fontSize: 14,
      fontWeight: '700',
    },

    /* 5. Seção Estante */
    bookshelfHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    bookshelfTitle: {
      color: t.text,
      fontSize: 20,
      fontWeight: '800',
    },
    bookshelfSeeAll: {
      color: t.accent,
      fontSize: 14,
      fontWeight: '700',
    },
    bookshelfLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    bookshelfLoadingText: {
      color: t.textSecondary,
      fontSize: 13,
    },
    bookshelfEmptyCard: {
      backgroundColor: 'transparent',
      borderRadius: 18,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: t.cardBorder,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyShelfIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: t.accent + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    bookshelfEmptyTitle: {
      color: t.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
    },
    bookshelfEmptySubtitle: {
      color: t.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 16,
    },
    addFirstBookButton: {
      backgroundColor: t.primary,
      borderRadius: 999,
      height: 40,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addFirstBookButtonText: {
      color: t.bg,
      fontSize: 13,
      fontWeight: '700',
    },
    bookshelfScroll: {
      paddingRight: 10,
      gap: 14,
    },
    bookCard: {
      width: 122,
    },
    bookCover: {
      width: 122,
      height: 168,
      borderRadius: 14,
      padding: 8,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: t.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
      position: 'relative',
      overflow: 'hidden',
    },
    coverImageFull: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    bookStatusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      zIndex: 2,
    },
    bookStatusText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    bookCoverCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.6,
    },
    bookCoverPages: {
      alignSelf: 'flex-end',
      color: t.textMuted,
      fontSize: 10,
      fontWeight: '700',
      zIndex: 2,
    },
    bookTitle: {
      color: t.text,
      fontSize: 14,
      fontWeight: '800',
      marginTop: 8,
    },
    bookAuthor: {
      color: t.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },

  });
}
