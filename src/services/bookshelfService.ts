import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ItemEstante, StatusLeitura } from '../models/ItemEstante';
import { Livro } from '../models/Livro';

export interface ItemEstanteCompleto extends ItemEstante {
  livro: Livro;
}

/**
 * Retorna a referência da subcoleção de estante do usuário no Firestore.
 */
function getEstanteCollection(usuarioId: string) {
  return collection(db, 'usuarios', usuarioId, 'estante');
}

/**
 * Converte documento Firestore para ItemEstanteCompleto.
 */
function parseEstanteDoc(id: string, data: DocumentData): ItemEstanteCompleto {
  const dataAdicao = data.dataAdicao instanceof Timestamp
    ? data.dataAdicao.toDate()
    : data.dataAdicao
    ? new Date(data.dataAdicao)
    : new Date();

  return {
    id,
    usuarioId: data.usuarioId || '',
    livroId: data.livroId || data.livro?.idGoogleBooks || id,
    status: data.status || 'NA_FILA',
    progressoPaginas: data.progressoPaginas || 0,
    dataAdicao,
    livro: {
      idGoogleBooks: data.livro?.idGoogleBooks || data.livroId || id,
      titulo: data.livro?.titulo || 'Livro Sem Título',
      autor: data.livro?.autor || 'Autor Desconhecido',
      totalPaginas: data.livro?.totalPaginas || 1,
      urlCapa: data.livro?.urlCapa || '',
    },
  };
}

/**
 * Escuta em tempo real (onSnapshot) as alterações na estante do usuário no Firestore.
 */
export function subscribeToUserBookshelf(
  usuarioId: string,
  onUpdate: (items: ItemEstanteCompleto[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!usuarioId) {
    onUpdate([]);
    return () => {};
  }

  const estanteRef = getEstanteCollection(usuarioId);

  return onSnapshot(
    estanteRef,
    (snapshot) => {
      const items: ItemEstanteCompleto[] = snapshot.docs.map((docSnap) =>
        parseEstanteDoc(docSnap.id, docSnap.data())
      );
      onUpdate(items);
    },
    (err) => {
      console.warn('Erro ao escutar estante do Firestore:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Busca todos os livros da estante do usuário no Firestore.
 */
export async function fetchUserBookshelf(usuarioId: string): Promise<ItemEstanteCompleto[]> {
  if (!usuarioId) return [];
  try {
    const estanteRef = getEstanteCollection(usuarioId);
    const snapshot = await getDocs(estanteRef);
    return snapshot.docs.map((docSnap) => parseEstanteDoc(docSnap.id, docSnap.data()));
  } catch (err) {
    console.warn('Erro ao buscar estante do usuário no Firestore:', err);
    return [];
  }
}

/**
 * Adiciona um livro à estante do usuário no Firestore.
 */
export async function addBookToBookshelf(
  usuarioId: string,
  livro: Livro,
  status: StatusLeitura = 'NA_FILA',
  progressoPaginas: number = 0
): Promise<string> {
  const estanteRef = getEstanteCollection(usuarioId);
  const docRef = await addDoc(estanteRef, {
    usuarioId,
    livroId: livro.idGoogleBooks,
    livro,
    status,
    progressoPaginas,
    dataAdicao: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Atualiza o status de leitura de um livro na estante.
 */
export async function updateBookStatus(
  usuarioId: string,
  itemId: string,
  status: StatusLeitura
): Promise<void> {
  const itemDocRef = doc(db, 'usuarios', usuarioId, 'estante', itemId);
  await updateDoc(itemDocRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Atualiza o progresso ou status de leitura de um livro na estante.
 */
export async function updateReadingProgress(
  usuarioId: string,
  itemId: string,
  progressoPaginas: number,
  status?: StatusLeitura
): Promise<void> {
  const itemDocRef = doc(db, 'usuarios', usuarioId, 'estante', itemId);
  const updatePayload: {
    progressoPaginas: number;
    updatedAt: ReturnType<typeof serverTimestamp>;
    status?: StatusLeitura;
  } = {
    progressoPaginas,
    updatedAt: serverTimestamp(),
  };
  if (status) {
    updatePayload.status = status;
  }
  await updateDoc(itemDocRef, updatePayload);
}

/**
 * Remove um livro da estante no Firestore.
 */
export async function removeBookFromBookshelf(
  usuarioId: string,
  itemId: string
): Promise<void> {
  const itemDocRef = doc(db, 'usuarios', usuarioId, 'estante', itemId);
  await deleteDoc(itemDocRef);
}

/**
 * Atualiza o autor de um livro na estante.
 */
export async function updateBookAuthor(
  usuarioId: string,
  itemId: string,
  novoAutor: string
): Promise<void> {
  const itemDocRef = doc(db, 'usuarios', usuarioId, 'estante', itemId);
  await updateDoc(itemDocRef, {
    'livro.autor': novoAutor.trim(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Atualiza o número total de páginas de um livro na estante.
 */
export async function updateBookTotalPages(
  usuarioId: string,
  itemId: string,
  novoTotalPaginas: number
): Promise<void> {
  const itemDocRef = doc(db, 'usuarios', usuarioId, 'estante', itemId);
  await updateDoc(itemDocRef, {
    'livro.totalPaginas': novoTotalPaginas,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Atualiza os detalhes de um livro na estante (autor, total de páginas, etc.).
 */
export async function updateBookDetails(
  usuarioId: string,
  itemId: string,
  updates: { autor?: string; totalPaginas?: number; titulo?: string }
): Promise<void> {
  const itemDocRef = doc(db, 'usuarios', usuarioId, 'estante', itemId);
  const payload: {
    updatedAt: ReturnType<typeof serverTimestamp>;
    'livro.autor'?: string;
    'livro.totalPaginas'?: number;
    'livro.titulo'?: string;
  } = {
    updatedAt: serverTimestamp(),
  };
  if (updates.autor !== undefined) {
    payload['livro.autor'] = updates.autor.trim();
  }
  if (updates.totalPaginas !== undefined) {
    payload['livro.totalPaginas'] = updates.totalPaginas;
  }
  if (updates.titulo !== undefined) {
    payload['livro.titulo'] = updates.titulo.trim();
  }
  await updateDoc(itemDocRef, payload);
}

/**
 * Limpa todos os itens da estante do usuário no Firestore.
 */
export async function clearUserBookshelf(usuarioId: string): Promise<void> {
  if (!usuarioId) return;
  try {
    const estanteRef = getEstanteCollection(usuarioId);
    const snapshot = await getDocs(estanteRef);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('Erro ao limpar estante do usuário:', err);
  }
}
