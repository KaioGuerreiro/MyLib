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

  const [activeFilter, setActiveFilter] = useState<TabFilter>('TODOS');
  const [estante, setEstante] = useState<ItemEstanteCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editingBook, setEditingBook] = useState<ItemEstanteCompleto | null>(null);
  const [customAuthor, setCustomAuthor] = useState<string>('');
  const [customPages, setCustomPages] = useState<string>('');
  const [savingBook, setSavingBook] = useState<boolean>(false);
  const [focusField, setFocusField] = useState<'author' | 'pages'>('author');

  const authorInputRef = useRef<TextInput>(null);
  const pagesInputRef = useRef<TextInput>(null);

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

  const filteredBooks = useMemo(() => {
    if (activeFilter === 'TODOS') return estante;
    return estante.filter((item) => item.status === activeFilter);
  }, [estante, activeFilter]);

  const counts = useMemo(() => ({
    TODOS: estante.length,
    LENDO: estante.filter((i) => i.status === 'LENDO').length,
    LIDO: estante.filter((i) => i.status === 'LIDO').length,
    NA_FILA: estante.filter((i) => i.status === 'NA_FILA').length,
  }), [estante]);

  const getStatusStyle = (status: StatusLeitura) => {
    switch (status) {
      case 'LENDO':
        return { bg: 'bg-accent/20', text: 'text-accentText', label: 'Lendo' };
      case 'LIDO':
        return { bg: 'bg-success/20', text: 'text-success', label: 'Lido' };
      case 'NA_FILA':
        return { bg: 'bg-warning/20', text: 'text-warning', label: 'Na Fila' };
      default:
        return { bg: 'bg-textMuted/20', text: 'text-textMuted', label: status };
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
    setTimeout(() => authorInputRef.current?.focus(), 150);
  };

  const handleOpenEditPagesModal = (item: ItemEstanteCompleto) => {
    setEditingBook(item);
    setCustomAuthor(item.livro.autor || '');
    setCustomPages(String(item.livro.totalPaginas || ''));
    setFocusField('pages');
    setTimeout(() => pagesInputRef.current?.focus(), 150);
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
        { text: '✍️ Corrigir Autor', onPress: () => handleOpenEditAuthorModal(item) },
        { text: '📄 Editar Total de Páginas', onPress: () => handleOpenEditPagesModal(item) },
        { text: '🗑️ Remover da Estante', style: 'destructive' as const, onPress: () => handleRemoveBook(item) },
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
        className="flex-row p-3.5 rounded-2xl border border-cardBorder bg-card items-center shadow-sm elevation-2"
        onPress={() => handleBookOptions(item)}
        activeOpacity={0.85}
      >
        {/* Capa */}
        <View
          className="w-[58px] h-[84px] rounded-xl overflow-hidden mr-3.5 items-center justify-center border border-cardBorder"
          style={{ backgroundColor: coverBg }}
        >
          {item.livro.urlCapa ? (
            <Image
              source={{ uri: item.livro.urlCapa }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="book-outline" size={24} color={theme.accentText} />
          )}
        </View>

        {/* Info */}
        <View className="flex-1 justify-center mr-1">
          <Text
            className="text-[15px] font-bold leading-5 mb-0.5 text-textPrimary"
            numberOfLines={2}
          >
            {item.livro.titulo}
          </Text>
          <Text
            className="text-xs font-medium mb-2 text-textSecondary"
            numberOfLines={1}
          >
            {item.livro.autor}
          </Text>

          {/* Badge de status */}
          <View
            className={`self-start px-2 py-0.5 rounded-md mb-1.5 ${statusStyle.bg}`}
          >
            <Text className={`text-[10px] font-bold uppercase ${statusStyle.text}`}>
              {statusStyle.label}
            </Text>
          </View>

          {/* Barra de progresso para livros em leitura */}
          {item.status === 'LENDO' && item.livro.totalPaginas > 0 && (
            <View className="mt-1">
              <View className="h-1.5 rounded-full overflow-hidden mb-1 bg-cardBorder">
                <View
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${progress}%` }}
                />
              </View>
              <Text className="text-[10px] font-medium text-textSecondary">
                {item.progressoPaginas}/{item.livro.totalPaginas} pág. ({progress}%)
              </Text>
            </View>
          )}

          {item.status !== 'LENDO' && item.livro.totalPaginas > 0 && (
            <Text className="text-[11px] font-medium text-textSecondary">
              {item.livro.totalPaginas} páginas
            </Text>
          )}
          {(!item.livro.totalPaginas || item.livro.totalPaginas === 0) && (
            <Text className="text-[10px] font-medium text-warning">
              Páginas não informadas (toque para editar)
            </Text>
          )}
        </View>

        {/* Ícone de opções */}
        <TouchableOpacity
          className="p-2 ml-1"
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
    <View className="flex-1 bg-bg px-5" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row justify-between items-center mb-5 pt-2">
        <View>
          <Text className="text-2xl font-extrabold tracking-tight text-textPrimary">
            Minha Biblioteca
          </Text>
          <Text className="text-xs font-medium mt-0.5 text-textSecondary">
            {estante.length} livro{estante.length !== 1 ? 's' : ''} na estante
          </Text>
        </View>
        <View className="w-11 h-11 rounded-full items-center justify-center border border-accent/35 bg-accent/20">
          <Ionicons name="library" size={22} color={theme.accent} />
        </View>
      </View>

      {/* Tabs de Filtro */}
      <View className="flex-row rounded-full border border-cardBorder bg-card p-1 mb-4 shadow-xs">
        {TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count = counts[tab.key];

          return (
            <TouchableOpacity
              key={tab.key}
              className="flex-1 flex-row items-center justify-center py-2.5 rounded-full overflow-hidden gap-1.5"
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
              <Text
                className={`text-xs font-semibold ${
                  isActive ? 'text-bg' : 'text-textMuted'
                }`}
              >
                {tab.label}
              </Text>
              <View
                className={`px-1.5 py-0.5 rounded-full min-w-4 items-center justify-center ${
                  isActive ? 'bg-black/20' : 'bg-cardBorder'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    isActive ? 'text-bg' : 'text-textMuted'
                  }`}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Conteúdo */}
      {loading ? (
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator size="large" color={theme.accent} />
          <Text className="text-xs font-medium mt-3 text-textSecondary">
            Carregando sua biblioteca...
          </Text>
        </View>
      ) : filteredBooks.length === 0 ? (
        <View className="flex-1 items-center justify-center py-16 px-6">
          <View className="w-18 h-18 rounded-full items-center justify-center mb-4 bg-accent/20">
            <Ionicons
              name={activeFilter === 'TODOS' ? 'library-outline' : 'book-outline'}
              size={36}
              color={theme.accent}
            />
          </View>
          <Text className="text-base font-bold text-center mb-1 text-textPrimary">
            {activeFilter === 'TODOS'
              ? 'Sua estante está vazia'
              : `Nenhum livro ${activeFilter === 'LENDO' ? 'em leitura' : activeFilter === 'LIDO' ? 'lido' : 'na fila'}`}
          </Text>
          <Text className="text-xs text-center leading-5 text-textSecondary">
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
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          ItemSeparatorComponent={() => <View className="h-2.5" />}
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

      {/* Modal para Editar Livro */}
      <Modal
        visible={!!editingBook}
        transparent
        animationType="fade"
        onRequestClose={handleCloseEditModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 bg-black/70 justify-center p-5">
            <KeyboardAwareScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              enableOnAndroid={true}
              keyboardShouldPersistTaps="handled"
            >
              <View className="rounded-3xl p-6 border border-cardBorder bg-card shadow-2xl">
                {/* Cabeçalho */}
                <View className="items-center mb-5">
                  <View className="w-12 h-12 rounded-2xl items-center justify-center mb-2 bg-accent/20">
                    <Ionicons name="create-outline" size={26} color={theme.accent} />
                  </View>
                  <Text className="text-lg font-bold text-center text-textPrimary">
                    Editar Detalhes do Livro
                  </Text>
                  {editingBook && (
                    <Text className="text-xs text-center mt-1 px-4 text-textSecondary" numberOfLines={2}>
                      {editingBook.livro.titulo}
                    </Text>
                  )}
                </View>

                {/* Input de Autor */}
                <View className="mb-4">
                  <Text className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-label">
                    Nome do Autor:
                  </Text>
                  <View className="flex-row items-center h-12 px-3.5 rounded-xl border border-inputBorder bg-inputBg">
                    <Ionicons name="person-outline" size={18} color={theme.textMuted} className="mr-2.5" />
                    <TextInput
                      ref={authorInputRef}
                      className="flex-1 text-sm h-full text-textPrimary"
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
                <View className="mb-6">
                  <Text className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-label">
                    Número Total de Páginas:
                  </Text>
                  <View className="flex-row items-center h-12 px-3.5 rounded-xl border border-inputBorder bg-inputBg">
                    <Ionicons name="book-outline" size={18} color={theme.textMuted} className="mr-2.5" />
                    <TextInput
                      ref={pagesInputRef}
                      className="flex-1 text-sm h-full text-textPrimary"
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
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 h-12 rounded-xl items-center justify-center border border-cardBorder"
                    onPress={handleCloseEditModal}
                    disabled={savingBook}
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs font-semibold text-textSecondary">
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 h-12 rounded-xl items-center justify-center flex-row shadow-md bg-primary"
                    onPress={handleSaveBookDetails}
                    disabled={savingBook}
                    activeOpacity={0.85}
                  >
                    {savingBook ? (
                      <ActivityIndicator size="small" color={theme.bg} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color={theme.bg} className="mr-1.5" />
                        <Text className="text-xs font-bold text-bg">
                          Salvar
                        </Text>
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
