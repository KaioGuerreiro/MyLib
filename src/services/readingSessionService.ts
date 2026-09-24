import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { TipoUnidade, SessaoLeitura } from '../models/SessaoLeitura';
import { Usuario } from '../models/Usuario';
import {
  formatarDataParaString,
  calcularNovaOfensiva,
  obterOfensivaAtualizada,
  calcularXpSessao,
  calcularNivel,
  DetalhesXpGanho,
} from '../utils/gamification';

export interface RegistrarSessaoParams {
  usuarioId: string;
  itemEstanteId: string;
  livroId: string;
  livroTitulo: string;
  totalPaginasLivro: number;
  progressoAtualLivro: number;
  quantidade: number;
  tipoUnidade: TipoUnidade;
  paginasLidasAdicionais?: number;
  usuarioAtual: {
    xpTotal: number;
    nivelAtual: number;
    ofensivaAtual: number;
    ultimaLeituraData?: string | null;
  };
}

export interface ResumoSessaoRegistrada {
  sessaoId: string;
  xpGanho: number;
  detalhesXp: DetalhesXpGanho;
  novoXpTotal: number;
  nivelAnterior: number;
  novoNivel: number;
  subiuDeNivel: boolean;
  ofensivaAnterior: number;
  novaOfensiva: number;
  streakIncrementado: boolean;
  streakResetado: boolean;
  concluiuLivro: boolean;
  novoProgressoPaginas: number;
}

/**
 * [RF003] Registra uma nova sessão de leitura e processa atomicamente as regras de
 * [RF004] (Ofensiva/Streak), [RF005] (Cálculo de XP) e [RF006] (Evolução de Nível).
 */
export async function registrarSessaoLeitura(
  params: RegistrarSessaoParams
): Promise<ResumoSessaoRegistrada> {
  const {
    usuarioId,
    itemEstanteId,
    livroId,
    livroTitulo,
    totalPaginasLivro,
    progressoAtualLivro,
    quantidade,
    tipoUnidade,
    paginasLidasAdicionais = 0,
    usuarioAtual,
  } = params;

  if (quantidade <= 0) {
    throw new Error('A quantidade lida deve ser maior que zero.');
  }

  const hojeStr = formatarDataParaString(new Date());
  const isFirstSessionOfDay = usuarioAtual.ultimaLeituraData !== hojeStr;

  // 1. [RF004] Calcular nova ofensiva
  const resultadoOfensiva = calcularNovaOfensiva(
    usuarioAtual.ultimaLeituraData,
    usuarioAtual.ofensivaAtual,
    new Date()
  );

  // 2. Calcular novo progresso do livro na estante
  const paginasAvancadas =
    tipoUnidade === 'paginas' ? quantidade : Math.max(0, paginasLidasAdicionais);

  const totalPaginas = Math.max(1, totalPaginasLivro || 1);
  const novoProgressoPaginas = Math.min(
    totalPaginas,
    Math.max(0, progressoAtualLivro) + paginasAvancadas
  );

  const concluiuLivro =
    totalPaginasLivro > 0 &&
    novoProgressoPaginas >= totalPaginasLivro &&
    progressoAtualLivro < totalPaginasLivro;

  // 3. [RF005] Calcular XP com bônus de constância e conclusão
  const detalhesXp = calcularXpSessao({
    quantidade,
    tipoUnidade,
    streakAtual: usuarioAtual.ofensivaAtual,
    isFirstSessionOfDay,
    concluiuLivro,
  });

  // 4. [RF006] Calcular novo nível do usuário
  const nivelAnterior = usuarioAtual.nivelAtual || 1;
  const novoXpTotal = Math.max(0, usuarioAtual.xpTotal || 0) + detalhesXp.xpTotal;
  const novoNivel = calcularNivel(novoXpTotal);
  const subiuDeNivel = novoNivel > nivelAnterior;

  // 5. Salvar sessão na subcoleção do usuário no Firestore
  const sessoesRef = collection(db, 'usuarios', usuarioId, 'sessoes');
  const sessaoDoc = await addDoc(sessoesRef, {
    usuarioId,
    itemEstanteId,
    livroId,
    livroTitulo,
    quantidade,
    tipoUnidade,
    xpGanho: detalhesXp.xpTotal,
    data: serverTimestamp(),
  });

  // 6. Atualizar progresso do livro na estante
  const itemDocRef = doc(db, 'usuarios', usuarioId, 'estante', itemEstanteId);
  const updateItemPayload: {
    progressoPaginas: number;
    updatedAt: ReturnType<typeof serverTimestamp>;
    status?: 'LENDO' | 'LIDO';
  } = {
    progressoPaginas: novoProgressoPaginas,
    updatedAt: serverTimestamp(),
  };

  if (concluiuLivro) {
    updateItemPayload.status = 'LIDO';
  } else {
    // Se o livro estava na fila, agora passa para lendo
    updateItemPayload.status = 'LENDO';
  }
  await updateDoc(itemDocRef, updateItemPayload);

  // 7. Atualizar usuário no Firestore com XP, nível e streak
  const usuarioDocRef = doc(db, 'usuarios', usuarioId);
  await updateDoc(usuarioDocRef, {
    xpTotal: novoXpTotal,
    nivelAtual: novoNivel,
    ofensivaAtual: resultadoOfensiva.novaOfensiva,
    ultimaLeituraData: hojeStr,
    updatedAt: serverTimestamp(),
  });

  return {
    sessaoId: sessaoDoc.id,
    xpGanho: detalhesXp.xpTotal,
    detalhesXp,
    novoXpTotal,
    nivelAnterior,
    novoNivel,
    subiuDeNivel,
    ofensivaAnterior: usuarioAtual.ofensivaAtual,
    novaOfensiva: resultadoOfensiva.novaOfensiva,
    streakIncrementado: resultadoOfensiva.streakIncrementado,
    streakResetado: resultadoOfensiva.streakResetado,
    concluiuLivro,
    novoProgressoPaginas,
  };
}

/**
 * Converte documento Firestore de sessão para o modelo SessaoLeitura.
 */
function parseSessaoDoc(id: string, data: DocumentData): SessaoLeitura {
  const dataSessao =
    typeof data.data?.toDate === 'function'
      ? data.data.toDate()
      : data.data
      ? new Date(data.data)
      : new Date();

  return {
    id,
    usuarioId: data.usuarioId || '',
    itemEstanteId: data.itemEstanteId || '',
    livroId: data.livroId || '',
    livroTitulo: data.livroTitulo || '',
    data: dataSessao,
    quantidade: data.quantidade || 0,
    tipoUnidade: data.tipoUnidade || 'paginas',
    xpGanho: data.xpGanho || 0,
  };
}

/**
 * Busca o histórico de sessões de leitura do usuário.
 */
export async function fetchUserSessions(
  usuarioId: string,
  maxResults: number = 20
): Promise<SessaoLeitura[]> {
  if (!usuarioId) return [];

  try {
    const sessoesRef = collection(db, 'usuarios', usuarioId, 'sessoes');
    const q = query(
      sessoesRef,
      orderBy('data', 'desc'),
      firestoreLimit(maxResults)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => parseSessaoDoc(docSnap.id, docSnap.data()));
  } catch (err) {
    console.warn('Erro ao buscar histórico de sessões:', err);
    return [];
  }
}

/**
 * Sincroniza e corrige a ofensiva do usuário caso tenha expirado por inatividade.
 */
export async function sincronizarOfensivaUsuario(usuario: Usuario): Promise<number> {
  if (!usuario?.id) return 0;

  const streakAjustado = obterOfensivaAtualizada(
    usuario.ultimaLeituraData,
    usuario.ofensivaAtual
  );

  // Se o streak no Firestore for diferente do streak ajustado (ex: expirou e virou 0)
  if (streakAjustado !== usuario.ofensivaAtual) {
    try {
      const usuarioDocRef = doc(db, 'usuarios', usuario.id);
      await updateDoc(usuarioDocRef, {
        ofensivaAtual: streakAjustado,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Erro ao sincronizar ofensiva do usuário:', err);
    }
  }

  return streakAjustado;
}
