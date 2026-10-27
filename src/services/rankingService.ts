import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ItemRanking } from '../models/Ranking';

/**
 * Converte documento Firestore de ranking para ItemRanking tipado.
 */
function parseRankingDoc(id: string, data: DocumentData, posicao: number): ItemRanking {
  const updatedAt =
    typeof data.updatedAt?.toDate === 'function'
      ? data.updatedAt.toDate()
      : data.updatedAt
      ? new Date(data.updatedAt)
      : undefined;

  return {
    id,
    nome: data.nome || 'Leitor Anônimo',
    xpTotal: Number(data.xpTotal) || 0,
    nivelAtual: Number(data.nivelAtual) || 1,
    ofensivaAtual: Number(data.ofensivaAtual) || 0,
    avatarId: data.avatarId || 'owl',
    posicao,
    totalLivrosLidos: data.totalLivrosLidos !== undefined ? Number(data.totalLivrosLidos) : undefined,
    totalPaginasLidas: data.totalPaginasLidas !== undefined ? Number(data.totalPaginasLidas) : undefined,
    ultimaLeituraData: data.ultimaLeituraData || null,
    updatedAt,
  };
}

export interface SincronizarRankingParams {
  id: string;
  nome?: string;
  xpTotal: number;
  nivelAtual: number;
  ofensivaAtual: number;
  avatarId?: string;
  ultimaLeituraData?: string | null;
}

/**
 * [Módulo 5 - Social] Atualiza ou cria o registro do leitor na tabela pública de ranking.
 */
export async function sincronizarRankingUsuario(
  usuario: SincronizarRankingParams,
  extra?: { livrosLidos?: number; paginasLidas?: number }
): Promise<void> {
  if (!usuario?.id) return;

  try {
    const rankingDocRef = doc(db, 'ranking', usuario.id);
    const payload: Record<string, any> = {
      id: usuario.id,
      nome: usuario.nome || 'Leitor',
      xpTotal: usuario.xpTotal || 0,
      nivelAtual: usuario.nivelAtual || 1,
      ofensivaAtual: usuario.ofensivaAtual || 0,
      avatarId: usuario.avatarId || 'owl',
      updatedAt: serverTimestamp(),
    };

    if (usuario.ultimaLeituraData !== undefined) {
      payload.ultimaLeituraData = usuario.ultimaLeituraData;
    }
    if (extra?.livrosLidos !== undefined) {
      payload.totalLivrosLidos = extra.livrosLidos;
    }
    if (extra?.paginasLidas !== undefined) {
      payload.totalPaginasLidas = extra.paginasLidas;
    }

    await setDoc(rankingDocRef, payload, { merge: true });
  } catch (err) {
    console.warn('Erro ao sincronizar ranking do usuário:', err);
  }
}

/**
 * [Módulo 5 - Social] Busca os líderes do ranking ordenados por XP ou por Ofensiva (Streak).
 */
export async function fetchRanking(
  criterio: 'xp' | 'streak' = 'xp',
  limite: number = 25
): Promise<ItemRanking[]> {
  try {
    const rankingRef = collection(db, 'ranking');
    const campoOrdenacao = criterio === 'streak' ? 'ofensivaAtual' : 'xpTotal';

    const q = query(
      rankingRef,
      orderBy(campoOrdenacao, 'desc'),
      firestoreLimit(limite)
    );

    const snap = await getDocs(q);
    const items: ItemRanking[] = [];

    snap.docs.forEach((docSnap, index) => {
      items.push(parseRankingDoc(docSnap.id, docSnap.data(), index + 1));
    });

    return items;
  } catch (err) {
    console.warn('Erro ao buscar ranking:', err);
    return [];
  }
}

/**
 * Remove o usuário do ranking (usado na exclusão de conta).
 */
export async function removerUsuarioDoRanking(usuarioId: string): Promise<void> {
  if (!usuarioId) return;
  try {
    const rankingDocRef = doc(db, 'ranking', usuarioId);
    await deleteDoc(rankingDocRef);
  } catch (err) {
    console.warn('Erro ao remover usuário do ranking:', err);
  }
}
