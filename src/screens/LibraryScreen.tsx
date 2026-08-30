import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ThemeType } from '../theme/colors';
import { StatusLeitura } from '../models/ItemEstante';
import {
  ItemEstanteCompleto,
  subscribeToUserBookshelf,
  updateBookStatus,
  updateBookDetails,
  removeBookFromBookshelf,
} from '../services/bookshelfService';

type TabFilter = 'TODOS' | 'LENDO' | 'LIDO' | 'NA_FILA';

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'LENDO', label: 'Lendo' },
  { key: 'LIDO', label: 'Lidos' },
  { key: 'NA_FILA', label: 'Na Fila' },
];

const COVER_COLORS = [
  '#2C2B4E',
  '#1F3238',
  '#352B44',
  '#2A3A2A',
  '#382C24',
  '#243340',
];

export default function LibraryScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const s = makeStyles(theme);

  const [activeFilter, setActiveFilter] = useState<TabFilter>('TODOS');
  const [estante, setEstante] = useState<ItemEstanteCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para o Modal de Edição de Livro (Autor e Páginas)
  const [editingBook, setEditingBook] = useState<ItemEstanteCompleto | null>(null);
  const [customAuthor, setCustomAuthor] = useState<string>('');
  const [customPages, setCustomPages] = useState<string>('');
  const [savingBook, setSavingBook] = useState<boolean>(false);
  const [focusField, setFocusField] = useState<'author' | 'pages'>('author');

  const authorInputRef = useRef<TextInput>(null);
  const pagesInputRef = useRef<TextInput>(null);

  // Inscrição em tempo real na estante do usuário
  useEffect(() => {
    if (!user?.uid) {
      setEstante([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeToUserBookshelf(
      user.uid,
      (items) => {
        setEstante(items);
        setLoading(false);
        setRefreshing(false);
      },
      () => {
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Filtragem por aba selecionada
  const filteredBooks = useMemo(() => {
    if (activeFilter === 'TODOS') return estante;
    return estante.filter((item) => item.status === activeFilter);
  }, [estante, activeFilter]);

  // Contadores para cada aba
  const counts = useMemo(() => ({
    TODOS: estante.length,
    LENDO: estante.filter((i) => i.status === 'LENDO').length,
    LIDO: estante.filter((i) => i.status === 'LIDO').length,
    NA_FILA: estante.filter((i) => i.status === 'NA_FILA').length,
  }), [estante]);

  const getStatusStyle = (status: StatusLeitura) => {
    switch (status) {
      case 'LENDO':
        return { bg: theme.accent + '20', text: theme.accentText, label: 'Lendo' };
      case 'LIDO':
        return { bg: theme.success + '20', text: theme.success, label: 'Lido' };
      case 'NA_FILA':
        return { bg: theme.warning + '20', text: theme.warning, label: 'Na Fila' };
      default:
        return { bg: theme.textMuted + '20', text: theme.textMuted, label: status };
    }
  };

  const handleStatusChange = async (item: ItemEstanteCompleto, newStatus: StatusLeitura) => {
    if (!user?.uid || !item.id) return;

    try {
      await updateBookStatus(user.uid, item.id, newStatus);
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
    }
  };

  const handleOpenEditAuthorModal = (item: ItemEstanteCompleto) => {
    setEditingBook(item);
    setCustomAuthor(item.livro.autor || '');
    setCustomPages(String(item.livro.totalPaginas || ''));
    setFocusField('author');
    setTimeout(() => {
      authorInputRef.current?.focus();
    }, 150);
  };

  const handleOpenEditPagesModal = (item: ItemEstanteCompleto) => {
    setEditingBook(item);
    setCustomAuthor(item.livro.autor || '');
    setCustomPages(String(item.livro.totalPaginas || ''));
    setFocusField('pages');
    setTimeout(() => {
      pagesInputRef.current?.focus();
    }, 150);
  };

  const handleCloseEditModal = () => {
    setEditingBook(null);
    setCustomAuthor('');
    setCustomPages('');
    setSavingBook(false);
  };

  const handleSaveBookDetails = async () => {
    if (!user?.uid || !editingBook?.id) return;

    const trimmedAuthor = customAuthor.trim();
    if (!trimmedAuthor) {
      Alert.alert('Autor obrigatório', 'Por favor, insira o nome do autor.');
      return;
    }

    const parsedPages = parseInt(customPages.trim(), 10);
    if (isNaN(parsedPages) || parsedPages <= 0) {
      Alert.alert('Páginas inválidas', 'Por favor, insira um número de páginas válido maior que 0.');
      return;
    }

    if (parsedPages > 50000) {
      Alert.alert('Valor muito alto', 'O número máximo permitido é de 50.000 páginas.');
      return;
    }

    setSavingBook(true);
    try {
      await updateBookDetails(user.uid, editingBook.id, {
        autor: trimmedAuthor,
        totalPaginas: parsedPages,
      });

      handleCloseEditModal();
      Alert.alert('Sucesso! ✨', 'Informações do livro atualizadas com sucesso.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as alterações do livro.');
    } finally {
      setSavingBook(false);
    }
  };

  const handleRemoveBook = (item: ItemEstanteCompleto) => {
    Alert.alert(
      'Remover Livro',
      `Deseja remover "${item.livro.titulo}" da sua estante?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            if (!user?.uid || !item.id) return;
            try {
              await removeBookFromBookshelf(user.uid, item.id);
            } catch {
              Alert.alert('Erro', 'Não foi possível remover o livro.');
            }
          },
        },
      ]
    );
  };

  const handleBookOptions = (item: ItemEstanteCompleto) => {
    const allOptions: { label: string; status: StatusLeitura }[] = [
      { label: '📖 Marcar como Lendo', status: 'LENDO' },
      { label: '✅ Marcar como Lido', status: 'LIDO' },
      { label: '📋 Marcar como Na Fila', status: 'NA_FILA' },
    ];
    const statusOptions = allOptions.filter((opt) => opt.status !== item.status);

    Alert.alert(
      item.livro.titulo,
      `Autor: ${item.livro.autor}\nTotal: ${item.livro.totalPaginas || 0} páginas\n\nEscolha uma ação:`,
      [
        ...statusOptions.map((opt) => ({
          text: opt.label,
          onPress: () => handleStatusChange(item, opt.status),
        })),
        {
          text: '✍️ Corrigir Autor',
          onPress: () => handleOpenEditAuthorModal(item),
        },
        {
          text: '📄 Editar Total de Páginas',
          onPress: () => handleOpenEditPagesModal(item),
        },
        {
          text: '🗑️ Remover da Estante',
          style: 'destructive' as const,
          onPress: () => handleRemoveBook(item),
        },
        { text: 'Cancelar', style: 'cancel' as const },
      ]
    );
  };

  const renderBookCard = ({ item, index }: { item: ItemEstanteCompleto; index: number }) => {
    const statusStyle = getStatusStyle(item.status);
    const coverBg = COVER_COLORS[index % COVER_COLORS.length];
    const progress = item.livro.totalPaginas > 0
      ? Math.min(100, Math.round((item.progressoPaginas / item.livro.totalPaginas) * 100))
      : 0;

    return (
      <TouchableOpacity
        style={s.bookCard}
        onPress={() => handleBookOptions(item)}
        activeOpacity={0.85}
      >
        {/* Capa */}
        <View style={[s.bookCover, { backgroundColor: coverBg }]}>
          {item.livro.urlCapa ? (
            <Image source={{ uri: item.livro.urlCapa }} style={s.coverImage} resizeMode="cover" />
          ) : (
            <View style={s.coverPlaceholder}>
              <Ionicons name="book-outline" size={26} color={theme.accentText} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={s.bookInfo}>
          <Text style={s.bookTitle} numberOfLines={2}>
            {item.livro.titulo}
          </Text>
          <Text style={s.bookAuthor} numberOfLines={1}>
            {item.livro.autor}
          </Text>

          {/* Badge de status */}
          <View style={[s.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[s.statusBadgeText, { color: statusStyle.text }]}>
              {statusStyle.label}
            </Text>
          </View>

          {/* Barra de progresso para livros em leitura */}
          {item.status === 'LENDO' && item.livro.totalPaginas > 0 && (
            <View style={s.progressSection}>
              <View style={s.progressBarTrack}>
                <View
                  style={[
                    s.progressBarFill,
                    { width: `${progress}%`, backgroundColor: theme.accent },
                  ]}
                />
              </View>
              <Text style={s.progressText}>
                {item.progressoPaginas}/{item.livro.totalPaginas} pág. ({progress}%)
              </Text>
            </View>
          )}

          {/* Páginas para livros lidos ou na fila */}
          {item.status !== 'LENDO' && item.livro.totalPaginas > 0 && (
            <Text style={s.pagesText}>{item.livro.totalPaginas} páginas</Text>
          )}
          {(!item.livro.totalPaginas || item.livro.totalPaginas === 0) && (
            <Text style={[s.pagesText, { color: theme.warning }]}>Páginas não informadas (toque para editar)</Text>
          )}
        </View>

        {/* Ícone de opções */}
        <TouchableOpacity
          style={s.optionsButton}
          onPress={() => handleBookOptions(item)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={theme.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingHorizontal: 20 }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Minha Biblioteca</Text>
          <Text style={s.headerSubtitle}>
            {estante.length} livro{estante.length !== 1 ? 's' : ''} na estante
          </Text>
        </View>
        <View style={s.headerIconCircle}>
          <Ionicons name="library" size={22} color={theme.accent} />
        </View>
      </View>

      {/* Tabs de Filtro */}
      <View style={s.tabsContainer}>
        {TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count = counts[tab.key];

          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, isActive && s.tabActive]}
              onPress={() => setActiveFilter(tab.key)}
              activeOpacity={0.8}
            >
              {isActive ? (
                <LinearGradient
                  colors={[theme.accent, theme.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
                />
              ) : null}
              <Text style={[s.tabText, isActive && s.tabTextActive]}>
                {tab.label}
              </Text>
              <View style={[s.tabCountBadge, isActive && s.tabCountBadgeActive]}>
                <Text style={[s.tabCountText, isActive && s.tabCountTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Conteúdo */}
      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={s.loadingText}>Carregando sua biblioteca...</Text>
        </View>
      ) : filteredBooks.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconCircle}>
            <Ionicons
              name={activeFilter === 'TODOS' ? 'library-outline' : 'book-outline'}
              size={36}
              color={theme.accent}
            />
          </View>
          <Text style={s.emptyTitle}>
            {activeFilter === 'TODOS'
              ? 'Sua estante está vazia'
              : `Nenhum livro ${activeFilter === 'LENDO' ? 'em leitura' : activeFilter === 'LIDO' ? 'lido' : 'na fila'}`}
          </Text>
          <Text style={s.emptySubtitle}>
            {activeFilter === 'TODOS'
              ? 'Busque e adicione livros para começar sua jornada de leitura!'
              : 'Os livros aparecerão aqui quando você alterar o status deles.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={(item) => item.id || item.livroId}
          renderItem={renderBookCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            s.booksList,
            { paddingBottom: insets.bottom + 20 },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => setRefreshing(true)}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
        />
      )}

      {/* Modal para Editar Livro (Autor e Total de Páginas) */}
      <Modal
        visible={!!editingBook}
        transparent
        animationType="fade"
        onRequestClose={handleCloseEditModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.modalOverlay}>
            <KeyboardAwareScrollView
              contentContainerStyle={s.modalKeyboardContainer}
              enableOnAndroid={true}
              keyboardShouldPersistTaps="handled"
            >
              <View style={s.modalCard}>
                {/* Ícone e Cabeçalho */}
                <View style={s.modalHeader}>
                  <View style={s.modalIconCircle}>
                    <Ionicons name="create-outline" size={26} color={theme.accent} />
                  </View>
                  <Text style={s.modalTitle}>Editar Detalhes do Livro</Text>
                  {editingBook && (
                    <Text style={s.modalBookTitle} numberOfLines={2}>
                      {editingBook.livro.titulo}
                    </Text>
                  )}
                </View>

                {/* Input de Autor */}
                <View style={s.modalInputSection}>
                  <Text style={s.modalInputLabel}>Nome do Autor:</Text>
                  <View style={s.modalInputWrapper}>
                    <Ionicons name="person-outline" size={18} color={theme.textMuted} style={{ marginRight: 10 }} />
                    <TextInput
                      ref={authorInputRef}
                      style={s.modalInput}
                      value={customAuthor}
                      onChangeText={setCustomAuthor}
                      placeholder="Ex: J.K. Rowling, Machado de Assis"
                      placeholderTextColor={theme.textMuted}
                      autoFocus={focusField === 'author'}
                      selectTextOnFocus
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Input de Páginas */}
                <View style={s.modalInputSection}>
                  <Text style={s.modalInputLabel}>Número Total de Páginas:</Text>
                  <View style={s.modalInputWrapper}>
                    <Ionicons name="book-outline" size={18} color={theme.textMuted} style={{ marginRight: 10 }} />
                    <TextInput
                      ref={pagesInputRef}
                      style={s.modalInput}
                      value={customPages}
                      onChangeText={setCustomPages}
                      placeholder="Ex: 350"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="numeric"
                      maxLength={6}
                      autoFocus={focusField === 'pages'}
                      selectTextOnFocus
                    />
                  </View>
                </View>

                {/* Botões de Ação */}
                <View style={s.modalActions}>
                  <TouchableOpacity
                    style={s.modalCancelButton}
                    onPress={handleCloseEditModal}
                    disabled={savingBook}
                    activeOpacity={0.7}
                  >
                    <Text style={s.modalCancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.modalSaveButton}
                    onPress={handleSaveBookDetails}
                    disabled={savingBook}
                    activeOpacity={0.85}
                  >
                    {savingBook ? (
                      <ActivityIndicator size="small" color={theme.bg} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color={theme.bg} style={{ marginRight: 6 }} />
                        <Text style={s.modalSaveButtonText}>Salvar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAwareScrollView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

function makeStyles(t: ThemeType) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },

    /* Header */
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    headerTitle: {
      color: t.text,
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    headerSubtitle: {
      color: t.textSecondary,
      fontSize: 13,
      fontWeight: '500',
      marginTop: 3,
    },
    headerIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: t.accent + '20',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.accent + '35',
    },

    /* Tabs */
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: t.card,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.cardBorder,
      padding: 4,
      marginBottom: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 999,
      gap: 5,
      overflow: 'hidden',
    },
    tabActive: {
      backgroundColor: 'transparent',
    },
    tabText: {
      color: t.textMuted,
      fontSize: 13,
      fontWeight: '600',
      zIndex: 1,
    },
    tabTextActive: {
      color: t.bg,
      fontWeight: '700',
      zIndex: 1,
    },
    tabCountBadge: {
      backgroundColor: t.cardBorder,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 1,
      minWidth: 20,
      alignItems: 'center',
      zIndex: 1,
    },
    tabCountBadgeActive: {
      backgroundColor: 'rgba(255,255,255,0.25)',
      zIndex: 1,
    },
    tabCountText: {
      color: t.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    tabCountTextActive: {
      color: t.bg,
    },

    /* Books List */
    booksList: {
      gap: 0,
    },
    bookCard: {
      flexDirection: 'row',
      backgroundColor: t.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.cardBorder,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    bookCover: {
      width: 68,
      height: 98,
      borderRadius: 12,
      overflow: 'hidden',
      marginRight: 16,
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    coverImage: {
      width: '100%',
      height: '100%',
    },
    coverPlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bookInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    bookTitle: {
      color: t.text,
      fontSize: 15,
      fontWeight: '700',
      lineHeight: 20,
      marginBottom: 3,
    },
    bookAuthor: {
      color: t.textSecondary,
      fontSize: 13,
      fontWeight: '500',
      marginBottom: 8,
    },

    /* Status Badge */
    statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      marginBottom: 8,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    /* Progress */
    progressSection: {
      marginTop: 2,
    },
    progressBarTrack: {
      height: 6,
      backgroundColor: t.inputBg,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 4,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    progressText: {
      color: t.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    pagesText: {
      color: t.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },

    /* Options */
    optionsButton: {
      alignSelf: 'flex-start',
      padding: 4,
      marginLeft: 4,
    },

    /* Loading */
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
    },
    loadingText: {
      color: t.textSecondary,
      fontSize: 14,
      fontWeight: '500',
    },

    /* Empty State */
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      shadowColor: t.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 4,
    },
    emptyTitle: {
      color: t.text,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtitle: {
      color: t.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },

    /* Modal Styles */
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    modalKeyboardContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    modalCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: t.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: t.cardBorder,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 10,
    },
    modalHeader: {
      alignItems: 'center',
      marginBottom: 18,
    },
    modalIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: t.accent + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: t.accent + '35',
    },
    modalTitle: {
      color: t.text,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 4,
      textAlign: 'center',
    },
    modalBookTitle: {
      color: t.textSecondary,
      fontSize: 13,
      fontWeight: '500',
      textAlign: 'center',
      paddingHorizontal: 10,
      lineHeight: 18,
    },
    modalInputSection: {
      marginBottom: 16,
    },
    modalInputLabel: {
      color: t.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 6,
    },
    modalInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.inputBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.inputBorder,
      paddingHorizontal: 14,
      height: 48,
    },
    modalInput: {
      flex: 1,
      color: t.text,
      fontSize: 15,
      fontWeight: '600',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    modalCancelButton: {
      flex: 1,
      height: 46,
      borderRadius: 999,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelButtonText: {
      color: t.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
    modalSaveButton: {
      flex: 1,
      height: 46,
      borderRadius: 999,
      backgroundColor: t.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: t.primaryShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    modalSaveButtonText: {
      color: t.bg,
      fontSize: 14,
      fontWeight: '800',
    },
  });
}
