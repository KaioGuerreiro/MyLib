/**
 * Serviço de Integração com Google Books API e Open Library API.
 * Suporta busca por título, autor, ISBN, exploração por categorias,
 * ranqueamento inteligente de relevância, deduplicação e fallback transparente.
 */
import { Livro } from '../models/Livro';

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';
const OPEN_LIBRARY_SUBJECT_URL = 'https://openlibrary.org/subjects';

// A chave é opcional: sem ela, a API pública continua funcionando com limites próprios.
// Mantê-la no ambiente evita publicar uma chave específica no código-fonte.
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;

/**
 * Interfaces para tipagem dos dados da Google Books API.
 */
interface GoogleBooksVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  description?: string;
  pageCount?: number;
  categories?: string[];
  publishedDate?: string;
  language?: string;
  ratingsCount?: number;
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
  };
}

interface GoogleBooksItem {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksItem[];
}

/**
 * Interfaces para tipagem dos dados da Open Library API.
 */
interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  number_of_pages_median?: number;
  number_of_pages?: number;
  cover_i?: number;
  cover_edition_key?: string;
}

interface OpenLibraryResponse {
  numFound: number;
  docs: OpenLibraryDoc[];
}

interface OpenLibrarySubjectWork {
  key: string;
  title: string;
  authors?: { name: string }[];
  cover_id?: number;
  edition_count?: number;
}

interface OpenLibrarySubjectResponse {
  work_count: number;
  works: OpenLibrarySubjectWork[];
}

/**
 * Configuração canônica de categorias e acervo curado para exploração de alta qualidade.
 */
export const CATEGORY_CONFIGS: Record<
  string,
  { label: string; curatedQueries: string[]; openLibSubject: string }
> = {
  fiction: {
    label: 'Ficção',
    curatedQueries: [
      '1984 George Orwell',
      'Dom Casmurro Machado de Assis',
      'O Pequeno Príncipe',
      'A Revolução dos Bichos',
      'Fahrenheit 451 Ray Bradbury',
      'Ensaio sobre a Cegueira Saramago',
      'O Alquimista Paulo Coelho',
      'Capitães da Areia Jorge Amado',
      'Admirável Mundo Novo Huxley',
      'A Hora da Estrela Clarice Lispector',
    ],
    openLibSubject: 'fiction',
  },
  fantasy: {
    label: 'Fantasia',
    curatedQueries: [
      'Harry Potter J.K. Rowling',
      'O Senhor dos Anéis Tolkien',
      'Percy Jackson Rick Riordan',
      'O Hobbit Tolkien',
      'As Crônicas de Nárnia C.S. Lewis',
      'O Nome do Vento Patrick Rothfuss',
      'Corte de Espinhos e Rosas Sarah J. Maas',
      'O Silmarillion Tolkien',
      'Eragon Christopher Paolini',
      'A Bússola de Ouro Philip Pullman',
    ],
    openLibSubject: 'fantasy',
  },
  science: {
    label: 'Ciência',
    curatedQueries: [
      'Sapiens Yuval Noah Harari',
      'Cosmos Carl Sagan',
      'Uma Breve História do Tempo Stephen Hawking',
      'O Mundo Assombrado pelos Demônios Carl Sagan',
      'O Gene Egoísta Richard Dawkins',
      'Breves Respostas para Grandes Questões Stephen Hawking',
      'A Dança do Universo Marcelo Gleiser',
      'Armas Germes e Aço Jared Diamond',
      'A Origem das Espécies Charles Darwin',
    ],
    openLibSubject: 'science',
  },
  romance: {
    label: 'Romance',
    curatedQueries: [
      'Orgulho e Preconceito Jane Austen',
      'É Assim que Acaba Colleen Hoover',
      'Amor & Gelato Jenna Evans Welch',
      'Os Sete Maridos de Evelyn Hugo',
      'A Culpa é das Estrelas John Green',
      'A Hipótese do Amor Ali Hazelwood',
      'Como Eu Era Antes de Você Jojo Moyes',
      'O Duque e Eu Julia Quinn',
      'Vermelho Branco e Sangue Azul',
      'Teto Para Dois Beth OLeary',
    ],
    openLibSubject: 'romance',
  },
  horror: {
    label: 'Terror',
    curatedQueries: [
      'O Iluminado Stephen King',
      'Drácula Bram Stoker',
      'It A Coisa Stephen King',
      'Contos de Terror Edgar Allan Poe',
      'Frankenstein Mary Shelley',
      'O Exorcista William Peter Blatty',
      'Misery Stephen King',
      'Carrie a Estranha Stephen King',
      'O Cemitério Stephen King',
      'Coraline Neil Gaiman',
    ],
    openLibSubject: 'horror',
  },
  biography: {
    label: 'Biografia',
    curatedQueries: [
      'Steve Jobs Walter Isaacson',
      'O Diário de Anne Frank',
      'Minha História Michelle Obama',
      'Leonardo da Vinci Walter Isaacson',
      'Elon Musk Walter Isaacson',
      'Longa Caminhada até a Liberdade Nelson Mandela',
      'Einstein Sua Vida Seu Universo Walter Isaacson',
      'Eu sou Malala Yousafzai',
      'Rita Lee Uma Autobiografia',
    ],
    openLibSubject: 'biography',
  },
  technology: {
    label: 'Tecnologia',
    curatedQueries: [
      'Código Limpo Robert Martin',
      'O Programador Pragmático',
      'Entendendo Algoritmos Aditya Bhargava',
      'Arquitetura Limpa Robert Martin',
      'Padrões de Projeto Gang of Four',
      'Refatoração Martin Fowler',
      'Domain-Driven Design Eric Evans',
      'JavaScript O Guia Definitivo David Flanagan',
      'Estruturas de Dados e Algoritmos com JavaScript',
    ],
    openLibSubject: 'computers',
  },
  'self-help': {
    label: 'Auto-ajuda',
    curatedQueries: [
      'Hábitos Atômicos James Clear',
      'O Poder do Hábito Charles Duhigg',
      'Pai Rico Pai Pobre Robert Kiyosaki',
      'Como Fazer Amigos e Influenciar Pessoas Dale Carnegie',
      'A Sutil Arte de Ligar o Foda-se Mark Manson',
      'Os Segredos da Mente Milionária T. Harv Eker',
      'Mindset Carol Dweck',
      'O Homem Mais Rico da Babilônia',
      'Essencialismo Greg McKeown',
    ],
    openLibSubject: 'self-help',
  },
};

/**
 * Termos para detectar e penalizar resumos acadêmicos, apostilas e partituras.
 */
const SPAM_KEYWORDS = [
  'resumo de',
  'resumo completo',
  'resumo detalhado',
  'study guide',
  'exam study guide',
  'análise do livro',
  'analise da obra',
  'analise de livro',
  'guia de estudo',
  'key takeaways',
  'summary of',
  'caderno de questões',
  'subject headings',
  'proceedings of the',
  'fascículo',
  'apostila',
  'livro de resumos',
  'sheet music',
  'for lute',
  'for vihuela',
  'partitura',
  'dicionário',
  'dictionary',
  'technical manual',
];

/**
 * Normaliza strings para comparações insensíveis a acentos, pontuação e caixa.
 */
function normalizeText(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Converte a URL de thumbnail do Google Books para HTTPS e melhora a resolução.
 */
function sanitizeCoverUrl(url?: string): string {
  if (!url) return '';
  let sanitized = url.replace(/^http:/, 'https:');
  sanitized = sanitized.replace('&edge=curl', '');
  sanitized = sanitized.replace(/zoom=\d/, 'zoom=2');
  return sanitized;
}

/**
 * Mapeia um item da Google Books API para a interface Livro.
 */
function mapGoogleBooksToLivro(item: GoogleBooksItem): Livro {
  const info = item.volumeInfo || {};
  return {
    idGoogleBooks: item.id,
    titulo: info.title || 'Sem Título',
    autor: info.authors?.join(', ') || 'Autor Desconhecido',
    totalPaginas: info.pageCount || 0,
    urlCapa: sanitizeCoverUrl(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail),
  };
}

/**
 * Mapeia um doc da Open Library API para a interface Livro.
 */
function mapOpenLibraryToLivro(doc: OpenLibraryDoc): Livro {
  const cleanId = doc.key.replace('/works/', '');
  const coverUrl = doc.cover_i
    ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
    : doc.cover_edition_key
    ? `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-M.jpg`
    : '';

  return {
    idGoogleBooks: `ol_${cleanId}`,
    titulo: doc.title || 'Sem Título',
    autor: doc.author_name?.join(', ') || 'Autor Desconhecido',
    totalPaginas: doc.number_of_pages_median || doc.number_of_pages || 0,
    urlCapa: coverUrl,
  };
}

/**
 * Mapeia um work de subject da Open Library para Livro.
 */
function mapOpenLibrarySubjectToLivro(work: OpenLibrarySubjectWork): Livro {
  const cleanId = work.key.replace('/works/', '');
  const coverUrl = work.cover_id
    ? `https://covers.openlibrary.org/b/id/${work.cover_id}-M.jpg`
    : '';

  return {
    idGoogleBooks: `ol_${cleanId}`,
    titulo: work.title || 'Sem Título',
    autor: work.authors?.map((a) => a.name).join(', ') || 'Autor Desconhecido',
    totalPaginas: 0,
    urlCapa: coverUrl,
  };
}

/**
 * Monta URL para Google Books com parâmetros.
 */
function buildGoogleBooksUrl(params: Record<string, string | number>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  if (API_KEY) {
    searchParams.append('key', API_KEY);
  }
  return `${GOOGLE_BOOKS_URL}?${searchParams.toString()}`;
}

/**
 * Avalia e pontua a relevância de um livro retornado pelo Google Books.
 */
function scoreGoogleBooksItem(
  item: GoogleBooksItem,
  query: string,
  isCategory: boolean = false
): number {
  const info = item.volumeInfo || {};
  const rawTitle = (info.title || '').trim();
  const titleNorm = normalizeText(rawTitle);
  const rawAuthors = info.authors || [];
  const authorsNorm = rawAuthors.map((a) => normalizeText(a));
  const lang = (info.language || '').toLowerCase();
  const pages = info.pageCount || 0;
  const hasCover = Boolean(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail);
  const qNorm = normalizeText(query);
  const qWords = qNorm.split(/\s+/).filter((w) => w.length > 1);

  // Descartar itens sem título válido
  if (!titleNorm || titleNorm === 'sem titulo' || titleNorm === 'undefined') return -999;

  let score = 0;

  // 1. Presença de Imagem de Capa (Crítico para boa experiência no app)
  if (hasCover) {
    score += 80;
  } else {
    score -= 60;
  }

  // 2. Idioma (Preferência expressiva para Português)
  if (lang.startsWith('pt')) {
    score += 70;
  } else if (lang.startsWith('en')) {
    score += isCategory ? -30 : 20;
  } else if (lang.startsWith('es')) {
    score += isCategory ? -20 : 10;
  } else {
    score -= 40;
  }

  // 3. Autoria identificada
  if (rawAuthors.length > 0 && rawAuthors[0] !== 'undefined' && rawAuthors[0] !== '') {
    score += 30;
  } else {
    score -= 80;
  }

  // 4. Sanidade de contagem de páginas
  if (pages >= 100) {
    score += 30;
  } else if (pages >= 40) {
    score += 15;
  } else if (pages > 0 && pages < 25) {
    score -= 50; // Amostras, panfletos ou resumos rápidos
  }

  // 5. Filtro Anti-Spam e Anti-Resumos
  const isSummaryQuery =
    qNorm.includes('resumo') || qNorm.includes('guia') || qNorm.includes('analise');
  if (!isSummaryQuery && SPAM_KEYWORDS.some((kw) => titleNorm.includes(kw))) {
    score -= 250;
  }

  // 6. Avaliação de correspondência com a busca digitada
  if (!isCategory && qNorm) {
    const isAuthorMatch = authorsNorm.some(
      (a) => a.includes(qNorm) || (qWords.length > 1 && qWords.every((w) => a.includes(w)))
    );
    const isExactTitle = titleNorm === qNorm;
    const startsWithTitle = titleNorm.startsWith(qNorm);
    const containsTitle = titleNorm.includes(qNorm);

    if (isAuthorMatch) {
      // O usuário buscou pelo nome de um autor (ex: "Stephen King", "Machado de Assis")
      score += 200; // As obras do autor ganham prioridade máxima
      if (isExactTitle) score += 30;
      else if (startsWithTitle) score += 20;
    } else {
      // O usuário buscou por título ou franquia (ex: "Harry Potter", "Dom Casmurro")
      if (isExactTitle) {
        score += 160;
      } else if (startsWithTitle) {
        score += 130;
      } else if (containsTitle) {
        score += 85;
      } else {
        const matched = qWords.filter((w) => titleNorm.includes(w));
        score += Math.round((matched.length / Math.max(1, qWords.length)) * 50);
      }
    }
  }

  return score;
}

/**
 * Processa, pontua, filtra e deduplica resultados do Google Books.
 */
function processAndRankGoogleBooks(
  items: GoogleBooksItem[],
  query: string,
  isCategory: boolean = false
): Livro[] {
  if (!items || items.length === 0) return [];

  const scored = items.map((item) => ({
    item,
    score: scoreGoogleBooksItem(item, query, isCategory),
  }));

  // Ordena por maior pontuação de relevância
  scored.sort((a, b) => b.score - a.score);

  // Deduplicação inteligente de edições pelo par (título + primeiro autor normalizados)
  const seen = new Set<string>();
  const results: Livro[] = [];

  for (const { item, score } of scored) {
    if (score < -50) continue;

    const titleNorm = normalizeText(item.volumeInfo?.title || '').replace(/[^a-z0-9]/g, '');
    const authorNorm = normalizeText(item.volumeInfo?.authors?.[0] || '').replace(/[^a-z0-9]/g, '');
    const key = `${titleNorm}_${authorNorm}`;

    if (!seen.has(key)) {
      seen.add(key);
      results.push(mapGoogleBooksToLivro(item));
    }
  }

  return results;
}

/**
 * Busca livros via Open Library (Fallback automático).
 */
async function searchOpenLibrary(
  query: string,
  limit: number = 20
): Promise<{ livros: Livro[]; totalItems: number }> {
  try {
    const encoded = encodeURIComponent(query.trim());
    const url = `${OPEN_LIBRARY_SEARCH_URL}?q=${encoded}&limit=${Math.min(limit, 30)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenLibrary error: ${response.status}`);
    }

    const data: OpenLibraryResponse = await response.json();
    if (!data.docs || data.docs.length === 0) {
      return { livros: [], totalItems: 0 };
    }

    const livros = data.docs
      .map(mapOpenLibraryToLivro)
      .filter((l) => l.titulo !== 'Sem Título')
      .sort((a, b) => (b.urlCapa ? 1 : 0) - (a.urlCapa ? 1 : 0));

    return { livros, totalItems: data.numFound || livros.length };
  } catch (err) {
    console.warn('Erro na busca via Open Library:', err);
    throw err;
  }
}

/**
 * Busca livros por categoria via Open Library.
 */
async function searchOpenLibraryCategory(
  categoryKey: string,
  limit: number = 20
): Promise<{ livros: Livro[]; totalItems: number }> {
  try {
    const catConfig = CATEGORY_CONFIGS[categoryKey];
    const subject = catConfig ? catConfig.openLibSubject : categoryKey.trim().toLowerCase();
    const encoded = encodeURIComponent(subject);
    const url = `${OPEN_LIBRARY_SUBJECT_URL}/${encoded}.json?limit=${Math.min(limit, 30)}`;

    const response = await fetch(url);
    if (!response.ok) {
      return searchOpenLibrary(catConfig?.label || categoryKey, limit);
    }

    const data: OpenLibrarySubjectResponse = await response.json();
    if (!data.works || data.works.length === 0) {
      return searchOpenLibrary(catConfig?.label || categoryKey, limit);
    }

    const livros = data.works
      .map(mapOpenLibrarySubjectToLivro)
      .filter((l) => l.titulo !== 'Sem Título')
      .sort((a, b) => (b.urlCapa ? 1 : 0) - (a.urlCapa ? 1 : 0));

    return { livros, totalItems: data.work_count || livros.length };
  } catch {
    return searchOpenLibrary(categoryKey, limit);
  }
}

/**
 * Busca livros por ISBN com fallback.
 */
export async function searchBooksByISBN(isbn: string): Promise<Livro | null> {
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  if (!cleanISBN) return null;

  // 1. Tenta Google Books
  try {
    const url = buildGoogleBooksUrl({
      q: `isbn:${cleanISBN}`,
      maxResults: 1,
    });

    const response = await fetch(url);
    if (response.ok) {
      const data: GoogleBooksResponse = await response.json();
      if (data.items && data.items.length > 0) {
        return mapGoogleBooksToLivro(data.items[0]);
      }
    }
  } catch (err) {
    console.warn('[Google Books ISBN] Erro. Tentando Open Library...', err);
  }

  // 2. Fallback Open Library
  try {
    const result = await searchOpenLibrary(`isbn:${cleanISBN}`, 1);
    if (result.livros.length > 0) {
      return result.livros[0];
    }
  } catch (err) {
    console.warn('[Open Library ISBN] Erro:', err);
  }

  return null;
}

/**
 * Busca livros com sistema HÍBRIDO, RANQUEAMENTO AVANÇADO e FALLBACK AUTOMÁTICO:
 * 1. Detecta automaticamente se a query é ISBN.
 * 2. Tenta Google Books API com ranqueamento de relevância, deduplicação e filtro anti-spam.
 * 3. Se Google Books falhar ou retornar vazio, aciona instantaneamente a Open Library API.
 */
export async function searchBooks(
  query: string,
  maxResults: number = 20,
  startIndex: number = 0
): Promise<{ livros: Livro[]; totalItems: number }> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { livros: [], totalItems: 0 };
  }

  // Se for formato de ISBN (10 a 13 dígitos/hífens)
  const isISBN = /^[0-9-]{10,17}$/.test(trimmed);
  if (isISBN) {
    const livro = await searchBooksByISBN(trimmed);
    return {
      livros: livro ? [livro] : [],
      totalItems: livro ? 1 : 0,
    };
  }

  // 1. Tenta Google Books API
  try {
    const url = buildGoogleBooksUrl({
      q: trimmed,
      maxResults: Math.min(Math.max(maxResults * 2, 30), 40),
      startIndex,
      printType: 'books',
      orderBy: 'relevance',
    });

    const response = await fetch(url);

    if (response.ok) {
      const data: GoogleBooksResponse = await response.json();
      if (data.items && data.items.length > 0) {
        const rankedLivros = processAndRankGoogleBooks(data.items, trimmed, false);
        if (rankedLivros.length > 0) {
          return {
            livros: rankedLivros.slice(0, maxResults),
            totalItems: data.totalItems || rankedLivros.length,
          };
        }
      }
    } else {
      console.warn(`[Google Books] Status ${response.status}. Acionando fallback Open Library...`);
    }
  } catch (googleErr) {
    console.warn('[Google Books] Erro de requisição. Acionando fallback Open Library...', googleErr);
  }

  // 2. Fallback Automático transparente: Open Library API
  try {
    return await searchOpenLibrary(trimmed, maxResults);
  } catch (fallbackErr) {
    console.warn('[Open Library] Erro no fallback:', fallbackErr);
    throw new Error('Não foi possível conectar aos serviços de catálogo. Verifique sua conexão.');
  }
}

/**
 * Busca livros por categoria/gênero com consultas curadas de alta relevância e fallback.
 */
export async function searchBooksByCategory(
  categoryKey: string,
  maxResults: number = 20
): Promise<{ livros: Livro[]; totalItems: number }> {
  const catConfig = CATEGORY_CONFIGS[categoryKey];
  const queries = catConfig?.curatedQueries || [categoryKey];

  // 1. Tenta Google Books buscando simultaneamente as obras consagradas da categoria
  try {
    const fetchPromises = queries.map(async (q) => {
      try {
        const url = buildGoogleBooksUrl({
          q,
          maxResults: 2,
          printType: 'books',
        });
        const res = await fetch(url);
        if (!res.ok) return [];
        const data: GoogleBooksResponse = await res.json();
        return data.items || [];
      } catch {
        return [];
      }
    });

    const resultsArrays = await Promise.all(fetchPromises);
    const allItems = resultsArrays.flat();

    if (allItems.length > 0) {
      const rankedLivros = processAndRankGoogleBooks(allItems, categoryKey, true);
      if (rankedLivros.length > 0) {
        return {
          livros: rankedLivros.slice(0, maxResults),
          totalItems: rankedLivros.length,
        };
      }
    }
  } catch (err) {
    console.warn('[Google Books Category] Erro. Tentando Open Library...', err);
  }

  // 2. Fallback Open Library
  return searchOpenLibraryCategory(categoryKey, maxResults);
}

/**
 * Busca detalhes completos de um livro.
 */
export async function fetchBookDetails(googleBooksId: string): Promise<Livro | null> {
  // Se for ID do Open Library (começa com ol_)
  if (googleBooksId.startsWith('ol_')) {
    const cleanKey = googleBooksId.replace('ol_', '');
    try {
      const response = await fetch(`https://openlibrary.org/works/${cleanKey}.json`);
      if (response.ok) {
        const data = await response.json();
        return {
          idGoogleBooks: googleBooksId,
          titulo: data.title || 'Sem Título',
          autor: 'Autor Desconhecido',
          totalPaginas: 0,
          urlCapa: data.covers?.[0]
            ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`
            : '',
        };
      }
    } catch (err) {
      console.warn('Erro ao buscar detalhes no Open Library:', err);
    }
    return null;
  }

  // Se for Google Books
  let url = `${GOOGLE_BOOKS_URL}/${googleBooksId}`;
  if (API_KEY) {
    url += `?key=${API_KEY}`;
  }

  try {
    const response = await fetch(url);
    if (response.ok) {
      const item: GoogleBooksItem = await response.json();
      return mapGoogleBooksToLivro(item);
    }
  } catch (err) {
    console.warn('Erro ao buscar detalhes no Google Books:', err);
  }

  return null;
}
