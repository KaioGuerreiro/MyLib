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
import { ThemeType } from '../theme/colors';
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
  const s = makeStyles(theme);

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

  // Carrega buscas recentes do AsyncStorage
  useEffect(() => {
    loadRecentSearches();
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // Escuta a estante do usuário para saber quais livros já foram adicionados
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
      setSortBy('relevance'); // Reseta a ordenação para Relevância ao fazer nova busca

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

      // Limpar form
      setCustomBookTitle('');
      setCustomBookAuthor('');
      setCustomBookPages('');
    } catch {
      Alert.alert('Erro', 'Não foi possível adicionar o livro. Tente novamente.');
    } finally {
      setAddingBookId(null);
    }
  };

  // Ordenação dinâmica dos resultados
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
        return list; // Ordem de relevância do algoritmo
    }
  }, [results, sortBy]);

  const activeCategoryObject = CATEGORIES.find((c) => c.query === activeCategory);

  const renderBookItem = ({ item }: { item: Livro }) => {
    const isInShelf = estanteIds.has(item.idGoogleBooks);
    const isAdding = addingBookId === item.idGoogleBooks;

    return (
      <View style={s.bookResultCard}>
        {/* Capa do livro */}
        <View style={s.bookResultCover}>
          {item.urlCapa ? (
            <Image source={{ uri: item.urlCapa }} style={s.bookResultImage} resizeMode="cover" />
          ) : (
            <View style={s.bookResultCoverPlaceholder}>
              <Ionicons name="book-outline" size={28} color={theme.accentText} />
            </View>
          )}
        </View>

        {/* Info do livro */}
        <View style={s.bookResultInfo}>
          <Text style={s.bookResultTitle} numberOfLines={2}>
            {item.titulo}
          </Text>
          <Text style={s.bookResultAuthor} numberOfLines={1}>
            {item.autor}
          </Text>
          {item.totalPaginas > 0 && (
            <Text style={s.bookResultPages}>{item.totalPaginas} páginas</Text>
          )}
        </View>

        {/* Botão de adicionar */}
        <TouchableOpacity
          style={[
            s.addButton,
            isInShelf && s.addButtonDisabled,
          ]}
          onPress={() => handleAddToBookshelf(item)}
          disabled={isInShelf || isAdding}
          activeOpacity={0.8}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={theme.bg} />
          ) : isInShelf ? (
            <Ionicons name="checkmark" size={18} color={theme.success} />
          ) : (
            <Ionicons name="add" size={20} color={theme.bg} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const showInitialState = !hasSearched && !loading;

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingHorizontal: 20 }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Buscar Livros</Text>
        <Ionicons name="search" size={22} color={theme.accent} />
      </View>

      {/* Barra de busca */}
      <View style={s.searchBarContainer}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} style={s.searchIcon} />
          <TextInput
            ref={inputRef}
            style={s.searchInput}
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
            <TouchableOpacity onPress={handleClearQuery} activeOpacity={0.7} style={s.clearButton}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Barra rápida de categorias no topo se estiver nos resultados */}
      {hasSearched && (
        <View style={s.categoryChipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.categoryChipsScroll}
          >
            <TouchableOpacity
              style={[
                s.filterChip,
                !activeCategory && s.filterChipActive,
              ]}
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
                style={[
                  s.filterChipText,
                  !activeCategory && s.filterChipTextActive,
                ]}
              >
                Todas
              </Text>
            </TouchableOpacity>
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.query;
              return (
                <TouchableOpacity
                  key={cat.query}
                  style={[
                    s.filterChip,
                    isSelected && s.filterChipActive,
                  ]}
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
                    style={{ marginRight: 5, zIndex: 2 }}
                  />
                  <Text
                    style={[
                      s.filterChipText,
                      isSelected && s.filterChipTextActive,
                      { zIndex: 2 }
                    ]}
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
        /* Estado inicial: Buscas Recentes + Categorias */
        <FlatList
          data={[]}
          renderItem={null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.initialContent, { paddingBottom: insets.bottom + 100 }]}
          ListHeaderComponent={
            <>
              {/* Buscas Recentes */}
              {recentSearches.length > 0 && (
                <View style={s.section}>
                  <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>Buscas Recentes</Text>
                    <TouchableOpacity onPress={clearRecentSearches} activeOpacity={0.7}>
                      <Text style={s.clearAllText}>Limpar</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={s.recentChipsRow}>
                    {recentSearches.map((term, index) => (
                      <TouchableOpacity
                        key={`${term}-${index}`}
                        style={s.recentChip}
                        onPress={() => handleRecentSearch(term)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                        <Text style={s.recentChipText} numberOfLines={1}>{term}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Categorias */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Explorar Categorias</Text>
                <View style={s.categoriesGrid}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.query}
                      style={[
                        s.categoryCard,
                        activeCategory === cat.query && s.categoryCardActive,
                      ]}
                      onPress={() => handleCategoryPress(cat)}
                      activeOpacity={0.8}
                    >
                      <View style={[
                        s.categoryIconCircle,
                        activeCategory === cat.query && s.categoryIconCircleActive,
                      ]}>
                        {activeCategory === cat.query ? (
                          <LinearGradient
                            colors={[theme.accent, theme.primary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                          />
                        ) : null}
                        <Ionicons
                          name={cat.icon}
                          size={20}
                          color={activeCategory === cat.query ? theme.bg : theme.accent}
                          style={{ zIndex: 2 }}
                        />
                      </View>
                      <Text style={[
                        s.categoryLabel,
                        activeCategory === cat.query && s.categoryLabelActive,
                      ]}>
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
          {/* Header de resultados e Barra de Ordenação */}
          {!loading && hasSearched && results.length > 0 && (
            <View style={s.resultsMetaSection}>
              <View style={s.resultsHeader}>
                <Text style={s.resultsCount}>
                  {activeCategoryObject
                    ? `Categoria: ${activeCategoryObject.label} (${results.length} livros)`
                    : `${results.length} livro${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''}`}
                </Text>
              </View>

              {/* Filtros de Ordenação */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.sortChipsScroll}
              >
                <Text style={s.sortLabel}>Ordenar:</Text>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortBy === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[s.sortChip, isSelected && s.sortChipActive]}
                      onPress={() => setSortBy(opt.key)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={13}
                        color={isSelected ? theme.accentText : theme.textMuted}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[s.sortChipText, isSelected && s.sortChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {loading ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={s.loadingText}>Buscando livros mais relevantes...</Text>
            </View>
          ) : error ? (
            <View style={s.emptyState}>
              <View style={s.emptyIconCircle}>
                <Ionicons name="cloud-offline-outline" size={32} color={theme.danger} />
              </View>
              <Text style={s.emptyTitle}>Erro na busca</Text>
              <Text style={s.emptySubtitle}>{error}</Text>
              <TouchableOpacity
                style={s.retryButton}
                onPress={() => query.trim() ? performSearch(query) : activeCategory && performSearch(activeCategory, true)}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={16} color={theme.bg} style={{ marginRight: 6 }} />
                <Text style={s.retryButtonText}>Tentar Novamente</Text>
              </TouchableOpacity>
            </View>
          ) : results.length === 0 && hasSearched ? (
            <View style={s.emptyState}>
              <View style={s.emptyIconCircle}>
                <Ionicons name="search-outline" size={32} color={theme.textMuted} />
              </View>
              <Text style={s.emptyTitle}>Nenhum livro encontrado</Text>
              <Text style={s.emptySubtitle}>
                Tente buscar com outros termos ou explore as categorias.
              </Text>
              <TouchableOpacity
                style={s.customBookButton}
                onPress={() => setIsCustomBookModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.bg} style={{ marginRight: 6 }} />
                <Text style={s.customBookButtonText}>Criar Livro Manualmente</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={sortedResults}
              keyExtractor={(item) => item.idGoogleBooks}
              renderItem={renderBookItem}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              contentContainerStyle={[
                s.resultsList,
                { paddingBottom: insets.bottom + 100 },
              ]}
              ListFooterComponent={
                sortedResults.length > 0 ? (
                  <View style={s.listFooter}>
                    <Text style={s.listFooterText}>Não encontrou o seu livro?</Text>
                    <TouchableOpacity
                      style={s.customBookButtonOutline}
                      onPress={() => setIsCustomBookModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={18} color={theme.accent} style={{ marginRight: 4 }} />
                      <Text style={s.customBookButtonOutlineText}>Adicionar Manualmente</Text>
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
          contentContainerStyle={s.modalOverlay}
          enableOnAndroid={true}
          extraScrollHeight={Platform.OS === 'ios' ? 40 : 100}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Adicionar Livro</Text>
              <TouchableOpacity onPress={() => setIsCustomBookModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={s.modalBody}>
              <Text style={s.inputLabel}>Título do Livro</Text>
              <TextInput
                style={s.modalInput}
                placeholder="Ex: O Senhor dos Anéis"
                placeholderTextColor={theme.textMuted}
                value={customBookTitle}
                onChangeText={setCustomBookTitle}
              />

              <Text style={s.inputLabel}>Autor</Text>
              <TextInput
                style={s.modalInput}
                placeholder="Ex: J.R.R. Tolkien"
                placeholderTextColor={theme.textMuted}
                value={customBookAuthor}
                onChangeText={setCustomBookAuthor}
              />

              <Text style={s.inputLabel}>Número de Páginas</Text>
              <TextInput
                style={s.modalInput}
                placeholder="Ex: 500"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                value={customBookPages}
                onChangeText={setCustomBookPages}
              />

              <TouchableOpacity
                style={s.modalSubmitButton}
                onPress={handleAddCustomBook}
                activeOpacity={0.8}
              >
                <Text style={s.modalSubmitButtonText}>Salvar Livro</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAwareScrollView>
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
      marginBottom: 16,
    },
    headerTitle: {
      color: t.text,
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.3,
    },

    /* Search Bar */
    searchBarContainer: {
      marginBottom: 12,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.inputBg,
      borderRadius: 999, // Pílula
      borderWidth: 1,
      borderColor: t.inputBorder,
      paddingHorizontal: 16,
      height: 52,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      color: t.text,
      fontSize: 15,
      fontWeight: '500',
    },
    clearButton: {
      marginLeft: 8,
      padding: 4,
    },

    /* Category horizontal chips in results mode */
    categoryChipsContainer: {
      marginBottom: 10,
    },
    categoryChipsScroll: {
      gap: 8,
      paddingRight: 16,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.cardBorder,
      paddingHorizontal: 16,
      paddingVertical: 8,
      overflow: 'hidden',
    },
    filterChipActive: {
      borderWidth: 0,
      paddingHorizontal: 17,
      paddingVertical: 9,
    },
    filterChipText: {
      color: t.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    filterChipTextActive: {
      color: t.bg,
      fontWeight: '800',
    },

    /* Sections */
    initialContent: {
      paddingBottom: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      color: t.text,
      fontSize: 18,
      fontWeight: '700',
    },
    clearAllText: {
      color: t.accent,
      fontSize: 13,
      fontWeight: '600',
    },

    /* Recent Searches */
    recentChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    recentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.cardBorder,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
    },
    recentChipText: {
      color: t.textSecondary,
      fontSize: 13,
      fontWeight: '500',
      maxWidth: 120,
    },

    /* Categories */
    categoriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 12,
    },
    categoryCard: {
      width: '22.5%',
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    categoryCardActive: {
      backgroundColor: t.accent,
      borderColor: t.accent,
    },
    categoryIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.accent + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    categoryIconCircleActive: {
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    categoryLabel: {
      color: t.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
    },
    categoryLabelActive: {
      color: t.bg,
      fontWeight: '700',
    },

    /* Results Meta & Sort */
    resultsMetaSection: {
      marginBottom: 10,
      gap: 8,
    },
    resultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    resultsCount: {
      color: t.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    sortChipsScroll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 2,
    },
    sortLabel: {
      color: t.textMuted,
      fontSize: 12,
      fontWeight: '700',
      marginRight: 4,
    },
    sortChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.cardBorder,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    sortChipActive: {
      backgroundColor: t.accent + '20',
      borderColor: t.accent,
    },
    sortChipText: {
      color: t.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    sortChipTextActive: {
      color: t.accentText,
      fontWeight: '700',
    },

    /* Results List */
    resultsList: {
      paddingHorizontal: 16,
    },

    /* Book Result Card */
    bookResultCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.card,
      borderRadius: 16,
      padding: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    bookResultCover: {
      width: 56,
      height: 80,
      borderRadius: 8,
      overflow: 'hidden',
      marginRight: 12,
    },
    bookResultImage: {
      width: '100%',
      height: '100%',
    },
    bookResultCoverPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: t.accent + '20',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.accent + '30',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bookResultInfo: {
      flex: 1,
      marginRight: 10,
    },
    bookResultTitle: {
      color: t.text,
      fontSize: 15,
      fontWeight: '700',
      lineHeight: 20,
      marginBottom: 3,
    },
    bookResultAuthor: {
      color: t.textSecondary,
      fontSize: 13,
      fontWeight: '500',
      marginBottom: 4,
    },
    bookResultPages: {
      color: t.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },

    /* Add Button */
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: t.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    addButtonDisabled: {
      backgroundColor: t.success + '25',
      shadowOpacity: 0,
      elevation: 0,
    },

    /* Empty State */
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingTop: 60,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: t.accent + '15',
      borderWidth: 1,
      borderColor: t.accent + '30',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
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
    retryButton: {
      marginTop: 20,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.accent,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    retryButtonText: {
      color: t.bg,
      fontSize: 14,
      fontWeight: '700',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      gap: 12,
    },
    loadingText: {
      color: t.textSecondary,
      fontSize: 14,
      fontWeight: '500',
    },

    /* Custom Book Buttons & Footer */
    customBookButton: {
      marginTop: 24,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
    },
    customBookButtonText: {
      color: t.bg,
      fontSize: 15,
      fontWeight: '700',
    },
    listFooter: {
      alignItems: 'center',
      paddingVertical: 30,
      gap: 12,
    },
    listFooterText: {
      color: t.textMuted,
      fontSize: 14,
    },
    customBookButtonOutline: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: t.accent,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
    },
    customBookButtonOutlineText: {
      color: t.accent,
      fontSize: 14,
      fontWeight: '600',
    },

    /* Custom Book Modal */
    modalOverlay: {
      flexGrow: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: t.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    modalTitle: {
      color: t.text,
      fontSize: 20,
      fontWeight: '700',
    },
    modalBody: {
      gap: 16,
    },
    inputLabel: {
      color: t.textSecondary,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },
    modalInput: {
      backgroundColor: t.inputBg,
      borderWidth: 1,
      borderColor: t.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: t.text,
      fontSize: 15,
    },
    modalSubmitButton: {
      backgroundColor: t.accent,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 10,
    },
    modalSubmitButtonText: {
      color: t.bg,
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
