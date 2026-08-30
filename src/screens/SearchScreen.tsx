import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Livro } from '../models/Livro';
import { searchBooks, searchBooksByCategory } from '../services/googleBooksService';
import { addBookToBookshelf, subscribeToUserBookshelf, ItemEstanteCompleto } from '../services/bookshelfService';

const RECENT_SEARCHES_KEY = '@mylib_recent_searches';
const MAX_RECENT = 5;
const DEBOUNCE_MS = 500;

type SortOption = 'relevance' | 'pages_desc' | 'pages_asc' | 'title_asc' | 'author_asc';

const SORT_OPTIONS: { key: SortOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'relevance', label: 'Relevância', icon: 'flame-outline' },
  { key: 'pages_desc', label: '+ Páginas', icon: 'document-text-outline' },
  { key: 'pages_asc', label: '- Páginas', icon: 'document-outline' },
  { key: 'title_asc', label: 'Título A-Z', icon: 'text-outline' },
  { key: 'author_asc', label: 'Autor A-Z', icon: 'person-outline' },
];

const CATEGORIES = [
  { label: 'Ficção', icon: 'book-outline' as const, query: 'fiction' },
  { label: 'Fantasia', icon: 'planet-outline' as const, query: 'fantasy' },
  { label: 'Ciência', icon: 'flask-outline' as const, query: 'science' },
  { label: 'Romance', icon: 'heart-outline' as const, query: 'romance' },
  { label: 'Terror', icon: 'skull-outline' as const, query: 'horror' },
  { label: 'Biografia', icon: 'person-outline' as const, query: 'biography' },
  { label: 'Tecnologia', icon: 'hardware-chip-outline' as const, query: 'technology' },
  { label: 'Auto-ajuda', icon: 'sunny-outline' as const, query: 'self-help' },
];

export default function SearchScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Livro[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
  const [estanteIds, setEstanteIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  // Modal Custom Book
  const [isCustomBookModalVisible, setIsCustomBookModalVisible] = useState(false);
  const [customBookTitle, setCustomBookTitle] = useState('');
  const [customBookAuthor, setCustomBookAuthor] = useState('');
  const [customBookPages, setCustomBookPages] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToUserBookshelf(
      user.uid,
      (items: ItemEstanteCompleto[]) => {
        const ids = new Set(items.map((item) => item.livro.idGoogleBooks));
        setEstanteIds(ids);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (err) {
      console.warn('Erro ao carregar buscas recentes:', err);
    }
  };

  const saveRecentSearch = (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    setRecentSearches((current) => {
      const updated = [trimmed, ...current.filter((term) => term !== trimmed)].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)).catch((err) => {
        console.warn('Erro ao salvar busca recente:', err);
      });
      return updated;
    });
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const performSearch = useCallback(
    async (searchQuery: string, isCategory: boolean = false) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);
      setHasSearched(true);
      setSortBy('relevance');

      if (!isCategory) {
        saveRecentSearch(trimmed);
      }

      try {
        const result = isCategory
          ? await searchBooksByCategory(trimmed)
          : await searchBooks(trimmed);

        setResults(result.livros);
      } catch {
        setError('Não foi possível buscar livros. Verifique sua conexão.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setActiveCategory(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (text.trim().length >= 3) {
      debounceRef.current = setTimeout(() => {
        performSearch(text);
      }, DEBOUNCE_MS);
    } else if (text.trim().length === 0) {
      setResults([]);
      setHasSearched(false);
      setError(null);
    }
  };

  const handleClearQuery = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setError(null);
    setActiveCategory(null);
    inputRef.current?.focus();
  };

  const handleRecentSearch = (term: string) => {
    setQuery(term);
    setActiveCategory(null);
    performSearch(term);
    Keyboard.dismiss();
  };

  const handleCategoryPress = (category: typeof CATEGORIES[0]) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setActiveCategory(category.query);
    setQuery('');
    performSearch(category.query, true);
    Keyboard.dismiss();
  };

  const handleAddToBookshelf = async (livro: Livro) => {
    if (!user?.uid || addingBookId === livro.idGoogleBooks) return;

    if (estanteIds.has(livro.idGoogleBooks)) {
      Alert.alert('Livro já adicionado', `"${livro.titulo}" já está na sua estante.`);
      return;
    }

    setAddingBookId(livro.idGoogleBooks);

    try {
      await addBookToBookshelf(user.uid, livro, 'NA_FILA');
      Alert.alert('Livro Adicionado! 📚', `"${livro.titulo}" foi adicionado à sua estante.`);
    } catch {
      Alert.alert('Erro', 'Não foi possível adicionar o livro. Tente novamente.');
    } finally {
      setAddingBookId(null);
    }
  };

  const handleAddCustomBook = async () => {
    if (!user?.uid) return;

    const title = customBookTitle.trim();
    const author = customBookAuthor.trim();
    const pagesStr = customBookPages.trim();
    const pages = parseInt(pagesStr, 10);

    if (!title || !author) {
      Alert.alert('Campos incompletos', 'Por favor, preencha o título e o autor.');
      return;
    }

    if (isNaN(pages) || pages <= 0) {
      Alert.alert('Páginas inválidas', 'Por favor, insira um número válido de páginas.');
      return;
    }

    const customId = `custom_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const customLivro: Livro = {
      idGoogleBooks: customId,
      titulo: title,
      autor: author,
      totalPaginas: pages,
      urlCapa: '',
    };

    setAddingBookId(customId);
    setIsCustomBookModalVisible(false);

    try {
      await addBookToBookshelf(user.uid, customLivro, 'NA_FILA');
      Alert.alert('Livro Adicionado! 📚', `"${customLivro.titulo}" foi adicionado à sua estante.`);

      setCustomBookTitle('');
      setCustomBookAuthor('');
      setCustomBookPages('');
    } catch {
      Alert.alert('Erro', 'Não foi possível adicionar o livro. Tente novamente.');
    } finally {
      setAddingBookId(null);
    }
  };

  const sortedResults = useMemo(() => {
    if (!results || results.length === 0) return [];
    const list = [...results];

    switch (sortBy) {
      case 'pages_desc':
        return list.sort((a, b) => (b.totalPaginas || 0) - (a.totalPaginas || 0));
      case 'pages_asc':
        return list.sort((a, b) => (a.totalPaginas || 0) - (b.totalPaginas || 0));
      case 'title_asc':
        return list.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
      case 'author_asc':
        return list.sort((a, b) => a.autor.localeCompare(b.autor, 'pt-BR'));
      case 'relevance':
      default:
        return list;
    }
  }, [results, sortBy]);

  const activeCategoryObject = CATEGORIES.find((c) => c.query === activeCategory);

  const renderBookItem = ({ item }: { item: Livro }) => {
    const isInShelf = estanteIds.has(item.idGoogleBooks);
    const isAdding = addingBookId === item.idGoogleBooks;

    return (
      <View className="flex-row items-center p-3.5 rounded-2xl border border-cardBorder bg-card shadow-sm elevation-2">
        {/* Capa do Livro */}
        <View className="w-[58px] h-[84px] rounded-xl overflow-hidden mr-3.5 items-center justify-center border border-cardBorder bg-surface">
          {item.urlCapa ? (
            <Image
              source={{ uri: item.urlCapa }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-accent/15">
              <Ionicons name="book-outline" size={24} color={theme.accentText} />
            </View>
          )}
        </View>

        {/* Informações do Livro */}
        <View className="flex-1 justify-center mr-2">
          <Text className="text-[15px] font-bold leading-5 mb-1 text-textPrimary" numberOfLines={2}>
            {item.titulo}
          </Text>
          <Text className="text-xs font-medium mb-1.5 text-textSecondary" numberOfLines={1}>
            {item.autor}
          </Text>

          {item.totalPaginas > 0 && (
            <View className="flex-row items-center">
              <Ionicons
                name="document-text-outline"
                size={12}
                color={theme.textMuted}
                className="mr-1"
              />
              <Text className="text-[11px] font-medium text-textMuted">
                {item.totalPaginas} páginas
              </Text>
            </View>
          )}
        </View>

        {/* Botão de Adicionar / Já na Estante */}
        <TouchableOpacity
          className={`w-10 h-10 rounded-full items-center justify-center ${
            isInShelf
              ? 'bg-success/20 border border-success'
              : 'bg-accent shadow-md shadow-accent/30 elevation-3'
          }`}
          onPress={() => handleAddToBookshelf(item)}
          disabled={isInShelf || isAdding}
          activeOpacity={0.8}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={theme.bg} />
          ) : isInShelf ? (
            <Ionicons name="checkmark" size={20} color={theme.success} />
          ) : (
            <Ionicons name="add" size={22} color={theme.bg} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const showInitialState = !hasSearched && !loading;

  return (
    <View className="flex-1 bg-bg px-5" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4 pt-2">
        <Text className="text-2xl font-extrabold tracking-tight text-textPrimary">
          Buscar Livros
        </Text>
        <Ionicons name="search" size={22} color={theme.accent} />
      </View>

      {/* Barra de busca */}
      <View className="mb-4">
        <View className="flex-row items-center rounded-2xl border border-inputBorder bg-inputBg px-4 h-14 shadow-sm elevation-1">
          <Ionicons name="search-outline" size={20} color={theme.textMuted} className="mr-3" />
          <TextInput
            ref={inputRef}
            className="flex-1 text-[15px] font-medium h-full text-textPrimary py-0 my-0"
            style={{ paddingVertical: 0, textAlignVertical: 'center' }}
            placeholder="Buscar por título, autor ou ISBN..."
            placeholderTextColor={theme.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={() => query.trim() && performSearch(query)}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClearQuery} activeOpacity={0.7} className="p-1.5 ml-1">
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Barra rápida de categorias no topo se estiver nos resultados */}
      {hasSearched && (
        <View className="mb-2.5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}
          >
            <TouchableOpacity
              className={`flex-row items-center rounded-full border px-4 py-2 overflow-hidden ${
                !activeCategory
                  ? 'border-0 px-[17px] py-[9px]'
                  : 'bg-card border-cardBorder'
              }`}
              onPress={handleClearQuery}
              activeOpacity={0.7}
            >
              {!activeCategory ? (
                <LinearGradient
                  colors={[theme.accent, theme.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                />
              ) : null}
              <Text
                className={`text-xs font-semibold ${
                  !activeCategory ? 'text-bg' : 'text-textSecondary'
                }`}
              >
                Todas
              </Text>
            </TouchableOpacity>
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.query;
              return (
                <TouchableOpacity
                  key={cat.query}
                  className={`flex-row items-center rounded-full border px-4 py-2 overflow-hidden ${
                    isSelected
                      ? 'border-0 px-[17px] py-[9px]'
                      : 'bg-card border-cardBorder'
                  }`}
                  onPress={() => handleCategoryPress(cat)}
                  activeOpacity={0.7}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={[theme.accent, theme.primary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                    />
                  ) : null}
                  <Ionicons
                    name={cat.icon}
                    size={14}
                    color={isSelected ? theme.bg : theme.accent}
                    className="mr-1.5 z-10"
                  />
                  <Text
                    className={`text-xs font-semibold z-10 ${
                      isSelected ? 'text-bg' : 'text-textSecondary'
                    }`}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {showInitialState ? (
        /* Estado inicial */
        <FlatList
          data={[]}
          renderItem={null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          ListHeaderComponent={
            <>
              {/* Buscas Recentes */}
              {recentSearches.length > 0 && (
                <View className="mb-6">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-sm font-bold text-textPrimary">
                      Buscas Recentes
                    </Text>
                    <TouchableOpacity onPress={clearRecentSearches} activeOpacity={0.7}>
                      <Text className="text-xs font-semibold text-accentText">
                        Limpar
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {recentSearches.map((term, index) => (
                      <TouchableOpacity
                        key={`${term}-${index}`}
                        className="flex-row items-center px-3 py-2 rounded-xl border border-cardBorder bg-card gap-1.5"
                        onPress={() => handleRecentSearch(term)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                        <Text className="text-xs font-medium text-textPrimary" numberOfLines={1}>
                          {term}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Categorias */}
              <View className="mb-6">
                <Text className="text-sm font-bold mb-3 text-textPrimary">
                  Explorar Categorias
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.query}
                      className={`w-[48%] flex-row items-center p-3 rounded-2xl border shadow-xs ${
                        activeCategory === cat.query
                          ? 'bg-accent/20 border-accent'
                          : 'bg-card border-cardBorder'
                      }`}
                      onPress={() => handleCategoryPress(cat)}
                      activeOpacity={0.8}
                    >
                      <View className="w-10 h-10 rounded-xl items-center justify-center mr-2.5 overflow-hidden bg-accent/20">
                        {activeCategory === cat.query ? (
                          <LinearGradient
                            colors={[theme.accent, theme.primary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                          />
                        ) : null}
                        <Ionicons
                          name={cat.icon}
                          size={20}
                          color={activeCategory === cat.query ? theme.bg : theme.accent}
                          className="z-10"
                        />
                      </View>
                      <Text
                        className={`text-xs font-bold ${
                          activeCategory === cat.query ? 'text-accentText' : 'text-textPrimary'
                        }`}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          }
        />
      ) : (
        /* Resultados da busca */
        <>
          {!loading && hasSearched && results.length > 0 && (
            <View className="mb-3">
              <View className="mb-2">
                <Text className="text-xs font-semibold text-textSecondary">
                  {activeCategoryObject
                    ? `Categoria: ${activeCategoryObject.label} (${results.length} livros)`
                    : `${results.length} livro${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''}`}
                </Text>
              </View>

              {/* Filtros de Ordenação */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, alignItems: 'center' }}
              >
                <Text className="text-xs font-bold mr-1 text-textSecondary">
                  Ordenar:
                </Text>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortBy === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                        isSelected
                          ? 'bg-accent/20 border-accent'
                          : 'bg-card border-cardBorder'
                      }`}
                      onPress={() => setSortBy(opt.key)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={13}
                        color={isSelected ? theme.accentText : theme.textMuted}
                        className="mr-1"
                      />
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-accentText' : 'text-textMuted'
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {loading ? (
            <View className="flex-1 items-center justify-center py-12">
              <ActivityIndicator size="large" color={theme.accent} />
              <Text className="text-xs font-medium mt-3 text-textSecondary">
                Buscando livros mais relevantes...
              </Text>
            </View>
          ) : error ? (
            <View className="flex-1 items-center justify-center py-16 px-6">
              <View className="w-16 h-16 rounded-full items-center justify-center mb-3 bg-danger/20">
                <Ionicons name="cloud-offline-outline" size={32} color={theme.danger} />
              </View>
              <Text className="text-base font-bold text-center mb-1 text-textPrimary">
                Erro na busca
              </Text>
              <Text className="text-xs text-center mb-4 leading-5 text-textSecondary">
                {error}
              </Text>
              <TouchableOpacity
                className="flex-row items-center px-4 py-2.5 rounded-xl bg-primary"
                onPress={() => query.trim() ? performSearch(query) : activeCategory && performSearch(activeCategory, true)}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={16} color={theme.bg} className="mr-1.5" />
                <Text className="text-xs font-bold text-bg">
                  Tentar Novamente
                </Text>
              </TouchableOpacity>
            </View>
          ) : results.length === 0 && hasSearched ? (
            <View className="flex-1 items-center justify-center py-16 px-6">
              <View className="w-16 h-16 rounded-full items-center justify-center mb-3 bg-surface">
                <Ionicons name="search-outline" size={32} color={theme.textMuted} />
              </View>
              <Text className="text-base font-bold text-center mb-1 text-textPrimary">
                Nenhum livro encontrado
              </Text>
              <Text className="text-xs text-center mb-5 leading-5 text-textSecondary">
                Tente buscar com outros termos ou explore as categorias.
              </Text>
              <TouchableOpacity
                className="flex-row items-center px-5 py-3 rounded-2xl shadow-md bg-primary"
                onPress={() => setIsCustomBookModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.bg} className="mr-1.5" />
                <Text className="text-xs font-bold text-bg">
                  Criar Livro Manualmente
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={sortedResults}
              keyExtractor={(item) => item.idGoogleBooks}
              renderItem={renderBookItem}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View className="h-3" />}
              contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
              ListFooterComponent={
                sortedResults.length > 0 ? (
                  <View className="items-center py-6">
                    <Text className="text-xs font-medium mb-3 text-textSecondary">
                      Não encontrou o seu livro?
                    </Text>
                    <TouchableOpacity
                      className="flex-row items-center px-4 py-2.5 rounded-xl border border-accent bg-accent/15"
                      onPress={() => setIsCustomBookModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={18} color={theme.accent} className="mr-1" />
                      <Text className="text-xs font-bold text-accentText">
                        Adicionar Manualmente
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
          )}
        </>
      )}

      {/* Modal Criar Livro Customizado */}
      <Modal
        visible={isCustomBookModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCustomBookModalVisible(false)}
      >
        <KeyboardAwareScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 20 }}
          enableOnAndroid={true}
          extraScrollHeight={Platform.OS === 'ios' ? 40 : 100}
          keyboardShouldPersistTaps="handled"
        >
          <View className="rounded-3xl p-6 border border-cardBorder bg-card shadow-2xl">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-lg font-bold text-textPrimary">
                Adicionar Livro
              </Text>
              <TouchableOpacity onPress={() => setIsCustomBookModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View className="gap-4">
              <View>
                <Text className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-label">
                  Título do Livro
                </Text>
                <TextInput
                  className="h-12 px-3.5 rounded-xl border border-inputBorder bg-inputBg text-sm text-textPrimary py-0"
                  style={{ paddingVertical: 0, textAlignVertical: 'center' }}
                  placeholder="Ex: O Senhor dos Anéis"
                  placeholderTextColor={theme.textMuted}
                  value={customBookTitle}
                  onChangeText={setCustomBookTitle}
                />
              </View>

              <View>
                <Text className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-label">
                  Autor
                </Text>
                <TextInput
                  className="h-12 px-3.5 rounded-xl border border-inputBorder bg-inputBg text-sm text-textPrimary py-0"
                  style={{ paddingVertical: 0, textAlignVertical: 'center' }}
                  placeholder="Ex: J.R.R. Tolkien"
                  placeholderTextColor={theme.textMuted}
                  value={customBookAuthor}
                  onChangeText={setCustomBookAuthor}
                />
              </View>

              <View>
                <Text className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-label">
                  Número de Páginas
                </Text>
                <TextInput
                  className="h-12 px-3.5 rounded-xl border border-inputBorder bg-inputBg text-sm text-textPrimary py-0"
                  style={{ paddingVertical: 0, textAlignVertical: 'center' }}
                  placeholder="Ex: 500"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={customBookPages}
                  onChangeText={setCustomBookPages}
                />
              </View>

              <TouchableOpacity
                className="h-12 rounded-xl items-center justify-center mt-2 shadow-md bg-primary"
                onPress={handleAddCustomBook}
                activeOpacity={0.8}
              >
                <Text className="text-xs font-bold text-bg">
                  Salvar Livro
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </Modal>
    </View>
  );
}
