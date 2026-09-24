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
import { sendVerificationEmail } from '../services/authService';
import {
  ItemEstanteCompleto,
  subscribeToUserBookshelf,
} from '../services/bookshelfService';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import ReadingSessionModal from '../components/ReadingSessionModal';
import { calcularProgressoNivel } from '../utils/gamification';
import { sincronizarOfensivaUsuario } from '../services/readingSessionService';

const COVER_COLORS = [
  '#2C2B4E',
  '#1F3238',
  '#352B44',
  '#2A3A2A',
  '#382C24',
  '#243340',
];

export interface HomeScreenProps {
  navigation?: BottomTabNavigationProp<any>;
}

export default function HomeScreen({ navigation }: HomeScreenProps = {}) {
  const { isDark, theme, toggleTheme, toggleAnim } = useTheme();
  const { user, userData, signOut, refreshUserProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [sendingVerification, setSendingVerification] = useState(false);
  const [estante, setEstante] = useState<ItemEstanteCompleto[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [selectedBookForSession, setSelectedBookForSession] = useState<ItemEstanteCompleto | null>(null);

  const fullName = userData?.nome || user?.displayName || user?.email?.split('@')[0] || 'Leitor';
  const firstName = fullName.trim().split(' ')[0];
  const ofensivaDias = userData?.ofensivaAtual ?? 0;
  const nivelAtual = userData?.nivelAtual ?? 1;
  const xpTotal = userData?.xpTotal ?? 0;

  const progressoNivel = useMemo(() => {
    return calcularProgressoNivel(xpTotal);
  }, [xpTotal]);

  // Sincroniza e corrige a ofensiva caso tenha expirado por inatividade
  useEffect(() => {
    if (userData?.id) {
      sincronizarOfensivaUsuario(userData);
    }
  }, [userData]);

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

  const currentReading = useMemo(() => {
    return estante.find((item) => item.status === 'LENDO') || null;
  }, [estante]);

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
    } catch {
      // Ignorar erro silenciosamente
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
    setSelectedBookForSession(currentReading);
    setSessionModalVisible(true);
  };

  const handleOpenBookSession = (item: ItemEstanteCompleto) => {
    setSelectedBookForSession(item);
    setSessionModalVisible(true);
  };

  const getStatusBadgeStyle = (status: string) => {
    const norm = status.replace('_', ' ').toUpperCase();
    switch (norm) {
      case 'LIDO':
        return {
          bg: 'bg-success/20',
          border: 'border-success/60',
          text: 'text-success',
          label: 'LIDO',
        };
      case 'NA FILA':
        return {
          bg: 'bg-warning/20',
          border: 'border-warning/60',
          text: 'text-warning',
          label: 'NA FILA',
        };
      case 'LENDO':
      default:
        return {
          bg: 'bg-accent/20',
          border: 'border-accent/60',
          text: 'text-accentText',
          label: 'LENDO',
        };
    }
  };

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <StatusBar style={theme.statusBar} />

      {/* Blobs decorativos */}
      <View
        className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-10"
        style={{ backgroundColor: theme.blobLeft }}
      />
      <View
        className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full opacity-10"
        style={{ backgroundColor: theme.blobRight }}
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 90 }}
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
        <View className="flex-row items-center justify-between py-3 mb-5">
          <TouchableOpacity
            className="flex-row items-center flex-1 mr-2"
            onPress={handleSignOut}
            activeOpacity={0.8}
            accessibilityLabel="Opções de perfil e logout"
          >
            <View className="w-11 h-11 rounded-full items-center justify-center border border-warning/50 bg-warning/25 mr-2.5">
              <Text className="text-sm font-extrabold text-warning">
                {getInitials(fullName)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold tracking-tight text-textPrimary" numberOfLines={1}>
                {fullName}
              </Text>
              <Text className="text-xs font-medium mt-0.5 text-textSecondary">
                Leitor Nível {nivelAtual}
              </Text>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center gap-2">
            <View className="px-2.5 py-1 rounded-full border border-streak/40 bg-streak/20">
              <Text className="text-xs font-extrabold text-streak">
                {ofensivaDias} 🔥
              </Text>
            </View>
            <ThemeSlider isDark={isDark} onToggle={toggleTheme} anim={toggleAnim} />
          </View>
        </View>

        {/* Banner de Verificação de E-mail se não verificado */}
        {user && !user.emailVerified && (
          <TouchableOpacity
            className="flex-row items-center p-3 rounded-2xl border border-warning/40 bg-warning/15 mb-4"
            onPress={handleResendVerification}
            disabled={sendingVerification}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-unread-outline" size={18} color={theme.warning} className="mr-2" />
            <Text className="text-xs font-semibold flex-1 text-warning">
              {sendingVerification ? 'Enviando e-mail...' : 'E-mail não verificado. Clique para reenviar!'}
            </Text>
          </TouchableOpacity>
        )}

        {/* 2. Saudação */}
        <View className="mb-5">
          <Text className="text-2xl font-extrabold tracking-tight text-textPrimary">
            Olá, {firstName} 👋
          </Text>
          <Text className="text-sm mt-0.5 text-textSecondary">
            Pronto para continuar sua jornada?
          </Text>
        </View>

        {/* 3. Cards de Gamificação / Status (Grid 2 Colunas) */}
        <View className="flex-row gap-3.5 mb-3">
          {/* Card Ofensiva */}
          <View className="flex-1 flex-row items-center p-3.5 rounded-2xl border border-cardBorder bg-card shadow-sm elevation-2">
            <View className="w-11 h-11 rounded-xl items-center justify-center mr-3 bg-streak/25">
              <Ionicons name="flame" size={22} color={theme.streak} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-textPrimary">
                {ofensivaDias} dias
              </Text>
              <Text className="text-xs font-medium text-textSecondary">
                Ofensiva
              </Text>
            </View>
          </View>

          {/* Card Nível / XP */}
          <View className="flex-1 flex-row items-center p-3.5 rounded-2xl border border-cardBorder bg-card shadow-sm elevation-2">
            <View className="w-11 h-11 rounded-xl items-center justify-center mr-3 bg-accent/25">
              <Ionicons name="star" size={20} color={theme.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-accent">
                Nível {nivelAtual}
              </Text>
              <Text className="text-xs font-semibold text-accentText" numberOfLines={1}>
                {progressoNivel.tituloNivel}
              </Text>
            </View>
          </View>
        </View>

        {/* Barra de Progresso do Nível Atual */}
        <View className="p-3.5 rounded-2xl border border-cardBorder bg-card mb-5 shadow-sm elevation-1">
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-row items-center">
              <Ionicons name="flash-outline" size={14} color={theme.accent} className="mr-1.5" />
              <Text className="text-xs font-bold text-textPrimary">
                Rumo ao Nível {nivelAtual + 1}
              </Text>
            </View>
            <Text className="text-xs font-semibold text-accentText">
              {progressoNivel.xpAtualNoNivel} / {progressoNivel.xpParaProximoNivel} XP ({progressoNivel.percentual}%)
            </Text>
          </View>
          <View className="h-2 rounded-full overflow-hidden bg-cardBorder">
            <View
              className="h-full rounded-full bg-accent"
              style={{ width: `${progressoNivel.percentual}%` }}
            />
          </View>
        </View>

        {/* 4. Card de Leitura Atual ("Lendo Agora") */}
        {loadingBooks ? (
          <View className="p-8 rounded-3xl items-center justify-center border border-cardBorder bg-card mb-6">
            <ActivityIndicator size="small" color={theme.accent} />
            <Text className="text-xs mt-3 font-medium text-textSecondary">
              Carregando leitura atual...
            </Text>
          </View>
        ) : readingStats ? (
          <LinearGradient
            colors={isDark ? ['#242636', '#1E202E'] : ['#FFFFFF', '#F8F9FD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              padding: 20,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(145, 132, 217, 0.22)' : 'rgba(108, 92, 231, 0.16)',
              marginBottom: 24,
              shadowColor: isDark ? '#000000' : '#4C3ACB',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.35 : 0.08,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            {/* Header do Card: Badge + Percentual */}
            <View className="flex-row items-center justify-between mb-4">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 9999,
                  backgroundColor: isDark ? 'rgba(145, 132, 217, 0.20)' : 'rgba(108, 92, 231, 0.10)',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(145, 132, 217, 0.40)' : 'rgba(108, 92, 231, 0.25)',
                  gap: 5,
                }}
              >
                <Ionicons name="book" size={11} color={isDark ? theme.accentText : theme.accent} />
                <Text
                  style={{
                    color: isDark ? theme.accentText : theme.accent,
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 0.6,
                  }}
                >
                  LENDO AGORA
                </Text>
              </View>

              <Text className="text-xs font-bold text-textPrimary">
                {readingStats.percent}% Concluído
              </Text>
            </View>

            {/* Informações Principais: Capa + Título + Autor + Páginas */}
            <View className="flex-row items-center mb-4" style={{ gap: 14 }}>
              <View
                style={{
                  width: 68,
                  height: 98,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: isDark ? '#1C1D2A' : '#EDE8FF',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {readingStats.urlCapa ? (
                  <Image
                    source={{ uri: readingStats.urlCapa }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Ionicons name="book" size={28} color={theme.accentText} />
                  </View>
                )}
              </View>

              <View className="flex-1 justify-center">
                <Text
                  className="text-base font-bold leading-5 mb-1 text-textPrimary"
                  numberOfLines={2}
                >
                  {readingStats.titulo}
                </Text>
                <Text className="text-xs font-medium text-textSecondary mb-2" numberOfLines={1}>
                  {readingStats.autor || 'Autor desconhecido'}
                </Text>

                <View className="flex-row items-center" style={{ gap: 4 }}>
                  <Ionicons name="bookmark-outline" size={13} color={theme.textMuted} />
                  <Text className="text-xs font-medium text-textSecondary">
                    {readingStats.paginasLidas} de {readingStats.totalPaginas} pág.
                  </Text>
                </View>
              </View>
            </View>

            {/* Barra de Progresso */}
            <View className="h-2 rounded-full overflow-hidden mb-4 bg-cardBorder">
              <LinearGradient
                colors={['#9184D9', '#7A68C9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  height: '100%',
                  borderRadius: 4,
                  width: `${Math.max(readingStats.percent, 3)}%`,
                }}
              />
            </View>

            {/* Botão de Ação */}
            <TouchableOpacity
              style={{
                height: 48,
                borderRadius: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.accent,
                shadowColor: theme.accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 3,
                gap: 8,
              }}
              onPress={handleContinueReading}
              activeOpacity={0.85}
              accessibilityLabel="Continuar leitura"
              id="btn-continue-reading"
            >
              <Ionicons name="book-outline" size={18} color="#FFFFFF" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 }}>
                Continuar Leitura
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        ) : (
          /* Estado Vazio Dinâmico */
          <View className="p-6 rounded-3xl border border-cardBorder bg-card mb-6">
            <View className="self-start px-2.5 py-1 rounded-full border border-accent/40 bg-accent/20 mb-3">
              <Text className="text-[10px] font-extrabold tracking-wider text-accent">
                LEITURA ATUAL
              </Text>
            </View>

            <View className="items-center py-3">
              <View className="w-14 h-14 rounded-2xl items-center justify-center mb-3 bg-accent/20">
                <Ionicons name="book-outline" size={28} color={theme.accentText} />
              </View>
              <Text className="text-base font-bold text-center mb-1.5 text-textPrimary">
                Nenhum livro em leitura no momento
              </Text>
              <Text className="text-xs text-center leading-5 px-4 mb-5 text-textSecondary">
                Adicione um livro à sua estante para começar a registrar suas sessões e acompanhar o progresso.
              </Text>

              <TouchableOpacity
                className="px-5 py-2.5 rounded-xl flex-row items-center bg-primary"
                onPress={() => navigation?.navigate('Busca')}
                activeOpacity={0.85}
                accessibilityLabel="Buscar livros"
                id="btn-explore-books"
              >
                <Ionicons name="search" size={16} color="#FFFFFF" className="mr-1.5" />
                <Text className="text-xs font-bold text-white">
                  Buscar Livros
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 5. Seção "Sua Estante" */}
        <View className="flex-row justify-between items-center mb-3.5">
          <Text className="text-lg font-bold text-textPrimary">
            Sua Estante
          </Text>
          {estante.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation?.navigate('Biblioteca')}
              accessibilityLabel="Ver todos os livros da estante"
              id="btn-see-all-shelf"
            >
              <Text className="text-xs font-bold text-accentText">
                Ver Tudo ({estante.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingBooks ? (
          <View className="p-6 rounded-2xl items-center justify-center border border-cardBorder bg-card">
            <ActivityIndicator size="small" color={theme.accent} />
            <Text className="text-xs mt-2 text-textSecondary">
              Carregando sua estante...
            </Text>
          </View>
        ) : estante.length === 0 ? (
          <View className="p-6 rounded-3xl border border-cardBorder bg-card items-center py-6">
            <View className="w-14 h-14 rounded-2xl items-center justify-center mb-3 bg-accent/20">
              <Ionicons name="library-outline" size={30} color={theme.accent} />
            </View>
            <Text className="text-base font-bold text-center mb-1 text-textPrimary">
              Nenhum livro na estante
            </Text>
            <Text className="text-xs text-center mb-4 text-textSecondary">
              Sua estante ainda não possui livros cadastrados.
            </Text>
            <TouchableOpacity
              className="px-4 py-2.5 rounded-xl flex-row items-center bg-primary"
              onPress={() => navigation?.navigate('Busca')}
              activeOpacity={0.85}
              accessibilityLabel="Adicionar primeiro livro"
              id="btn-add-first-book"
            >
              <Ionicons name="add" size={18} color="#FFFFFF" className="mr-1" />
              <Text className="text-xs font-bold text-white">
                Adicionar Livro
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Carrossel de Livros */
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4, gap: 14 }}
          >
            {estante.map((item, index) => {
              const badgeStyle = getStatusBadgeStyle(item.status);
              const coverBg = COVER_COLORS[index % COVER_COLORS.length];

              return (
                <TouchableOpacity
                  key={item.id || item.livroId || index}
                  className="w-28"
                  activeOpacity={0.8}
                  onPress={() => handleOpenBookSession(item)}
                >
                  <View
                    className="w-28 h-40 rounded-2xl overflow-hidden mb-2 relative border border-cardBorder shadow-sm elevation-2"
                    style={{ backgroundColor: coverBg }}
                  >
                    {item.livro.urlCapa ? (
                      <Image
                        source={{ uri: item.livro.urlCapa }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Ionicons name="book-outline" size={28} color={theme.accentText} />
                      </View>
                    )}

                    {/* Overlay com Badges e Informações */}
                    <View className="absolute inset-0 p-2 justify-between">
                      {/* Status Badge */}
                      <View
                        className={`self-start px-2 py-0.5 rounded-md border ${badgeStyle.bg} ${badgeStyle.border}`}
                      >
                        <Text className={`text-[9px] font-extrabold tracking-wider ${badgeStyle.text}`}>
                          {badgeStyle.label}
                        </Text>
                      </View>

                      <Text className="text-[10px] font-bold self-end bg-black/60 px-1.5 py-0.5 rounded text-white overflow-hidden">
                        {item.livro.totalPaginas}p
                      </Text>
                    </View>
                  </View>

                  <Text className="text-xs font-bold leading-4 text-textPrimary" numberOfLines={1}>
                    {item.livro.titulo}
                  </Text>
                  <Text className="text-[11px] font-medium text-textSecondary" numberOfLines={1}>
                    {item.livro.autor}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </ScrollView>

      {/* Modal de Registro de Sessão de Leitura */}
      <ReadingSessionModal
        visible={sessionModalVisible}
        book={selectedBookForSession}
        user={userData}
        onClose={() => {
          setSessionModalVisible(false);
          setSelectedBookForSession(null);
        }}
      />
    </View>
  );
}
