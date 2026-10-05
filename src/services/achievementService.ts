import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  increment,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Conquista, CategoriaConquista } from '../models/Conquista';
import { calcularNivel } from '../utils/gamification';

export interface ConquistaDefinicao {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  categoria: CategoriaConquista;
  recompensaXp: number;
  alvo: number;
  avaliar: (stats: StatsUsuario) => boolean;
  obterProgresso: (stats: StatsUsuario) => number;
}

export interface StatsUsuario {
  streakAtual: number;
  livrosLidosTotal: number;
  paginasLidasTotal: number;
  nivelAtual: number;
  metasAtingidasTotal?: number;
}

export interface ConquistaComProgresso extends Conquista {
  id: string;
  alvo: number;
  progressoAtual: number;
  progressoPercentual: number;
  desbloqueada: boolean;
}

/**
 * Catálogo oficial de Conquistas e Medalhas do MyLib [RF007, RF008]
 */
export const CATALOGO_CONQUISTAS: ConquistaDefinicao[] = [
  // Categoria: Ofensiva / Streaks
  {
    id: 'streak_1',
    nome: 'Primeira Centelha',
    descricao: 'Inicie sua jornada registrando sua primeira leitura diária.',
    icone: 'flame-outline',
    categoria: 'streak',
    recompensaXp: 50,
    alvo: 1,
    avaliar: (s) => s.streakAtual >= 1,
    obterProgresso: (s) => Math.min(1, s.streakAtual),
  },
  {
    id: 'streak_3',
    nome: 'Chama Constante',
    descricao: 'Mantenha a ofensiva acesa por 3 dias consecutivos.',
    icone: 'flame',
    categoria: 'streak',
    recompensaXp: 100,
    alvo: 3,
    avaliar: (s) => s.streakAtual >= 3,
    obterProgresso: (s) => Math.min(3, s.streakAtual),
  },
  {
    id: 'streak_7',
    nome: 'Fogo Ardente',
    descricao: 'Complete uma semana inteira (7 dias) de leitura diária.',
    icone: 'bonfire',
    categoria: 'streak',
    recompensaXp: 250,
    alvo: 7,
    avaliar: (s) => s.streakAtual >= 7,
    obterProgresso: (s) => Math.min(7, s.streakAtual),
  },
  {
    id: 'streak_14',
    nome: 'Ritmo Inabalável',
    descricao: 'Alcance 14 dias seguidos mantendo o foco literário.',
    icone: 'sparkles',
    categoria: 'streak',
    recompensaXp: 500,
    alvo: 14,
    avaliar: (s) => s.streakAtual >= 14,
    obterProgresso: (s) => Math.min(14, s.streakAtual),
  },
  {
    id: 'streak_30',
    nome: 'Hábito de Ferro',
    descricao: 'Dedicação suprema: 30 dias de ofensiva ininterrupta!',
    icone: 'shield-checkmark',
    categoria: 'streak',
    recompensaXp: 1000,
    alvo: 30,
    avaliar: (s) => s.streakAtual >= 30,
    obterProgresso: (s) => Math.min(30, s.streakAtual),
  },

  // Categoria: Livros Concluídos
  {
    id: 'livro_1',
    nome: 'Primeira Grande Jornada',
    descricao: 'Termine de ler o seu primeiro livro no MyLib.',
    icone: 'book',
    categoria: 'livros',
    recompensaXp: 150,
    alvo: 1,
    avaliar: (s) => s.livrosLidosTotal >= 1,
    obterProgresso: (s) => Math.min(1, s.livrosLidosTotal),
  },
  {
    id: 'livros_3',
    nome: 'Trilogia Concluída',
    descricao: 'Finalize a leitura de 3 livros completos.',
    icone: 'library',
    categoria: 'livros',
    recompensaXp: 300,
    alvo: 3,
    avaliar: (s) => s.livrosLidosTotal >= 3,
    obterProgresso: (s) => Math.min(3, s.livrosLidosTotal),
  },
  {
    id: 'livros_5',
    nome: 'Devorador de Histórias',
    descricao: 'Alcance a marca notável de 5 livros concluídos.',
    icone: 'bookmarks',
    categoria: 'livros',
    recompensaXp: 600,
    alvo: 5,
    avaliar: (s) => s.livrosLidosTotal >= 5,
    obterProgresso: (s) => Math.min(5, s.livrosLidosTotal),
  },
  {
    id: 'livros_10',
    nome: 'Biblioteca de Mestre',
    descricao: 'Complete uma estante inteira com 10 livros lidos.',
    icone: 'ribbon',
    categoria: 'livros',
    recompensaXp: 1200,
    alvo: 10,
    avaliar: (s) => s.livrosLidosTotal >= 10,
    obterProgresso: (s) => Math.min(10, s.livrosLidosTotal),
  },

  // Categoria: Páginas Lidas
  {
    id: 'paginas_50',
    nome: 'Primeiro Capítulo',
    descricao: 'Leia suas primeiras 50 páginas acumuladas.',
    icone: 'document-text',
    categoria: 'paginas',
    recompensaXp: 75,
    alvo: 50,
    avaliar: (s) => s.paginasLidasTotal >= 50,
    obterProgresso: (s) => Math.min(50, s.paginasLidasTotal),
  },
  {
    id: 'paginas_200',
    nome: 'Mergulho Profundo',
    descricao: 'Acumule 200 páginas lidas através de suas sessões.',
    icone: 'newspaper',
    categoria: 'paginas',
    recompensaXp: 200,
    alvo: 200,
    avaliar: (s) => s.paginasLidasTotal >= 200,
    obterProgresso: (s) => Math.min(200, s.paginasLidasTotal),
  },
  {
    id: 'paginas_500',
    nome: 'Meio Milhar',
    descricao: 'Supere a barreira de 500 páginas de conhecimento absorvido.',
    icone: 'layers',
    categoria: 'paginas',
    recompensaXp: 500,
    alvo: 500,
    avaliar: (s) => s.paginasLidasTotal >= 500,
    obterProgresso: (s) => Math.min(500, s.paginasLidasTotal),
  },
  {
    id: 'paginas_1000',
    nome: 'Mil Milhas Literárias',
    descricao: 'Leia 1.000 páginas e torne-se uma lenda entre os leitores.',
    icone: 'medal',
    categoria: 'paginas',
    recompensaXp: 1000,
    alvo: 1000,
    avaliar: (s) => s.paginasLidasTotal >= 1000,
    obterProgresso: (s) => Math.min(1000, s.paginasLidasTotal),
  },

  // Categoria: Geral / Nível & Metas
  {
    id: 'nivel_5',
    nome: 'Leitor Experiente',
    descricao: 'Atinja o Nível 5 na sua jornada de evolução.',
    icone: 'school',
    categoria: 'geral',
    recompensaXp: 400,
    alvo: 5,
    avaliar: (s) => s.nivelAtual >= 5,
    obterProgresso: (s) => Math.min(5, s.nivelAtual),
  },
  {
    id: 'meta_cumprida',
    nome: 'Compromisso de Honra',
    descricao: 'Atinja sua primeira meta de leitura configurada.',
    icone: 'checkmark-circle',
    categoria: 'geral',
    recompensaXp: 200,
    alvo: 1,
    avaliar: (s) => (s.metasAtingidasTotal || 0) >= 1,
    obterProgresso: (s) => Math.min(1, s.metasAtingidasTotal || 0),
  },
];

/**
 * Converte documento Firestore em Conquista.
 */
function parseConquistaDoc(id: string, data: DocumentData): Conquista {
  const dataConquista =
    typeof data.dataConquista?.toDate === 'function'
      ? data.dataConquista.toDate()
      : data.dataConquista
      ? new Date(data.dataConquista)
      : new Date();

  return {
    id,
    usuarioId: data.usuarioId,
    nome: data.nome || '',
    descricao: data.descricao || '',
    icone: data.icone || 'trophy',
    categoria: (data.categoria as CategoriaConquista) || 'geral',
    recompensaXp: data.recompensaXp || 0,
    dataConquista,
    desbloqueada: true,
  };
}

/**
 * [RF008] Busca todas as conquistas já desbloqueadas pelo usuário no Firestore.
 */
export async function fetchUserAchievements(usuarioId: string): Promise<Conquista[]> {
  if (!usuarioId) return [];

  try {
    const conquistasRef = collection(db, 'usuarios', usuarioId, 'conquistas');
    const snapshot = await getDocs(conquistasRef);
    return snapshot.docs.map((docSnap) => parseConquistaDoc(docSnap.id, docSnap.data()));
  } catch (err) {
    console.warn('Erro ao buscar conquistas do usuário:', err);
    return [];
  }
}

export interface ResultadoProcessamentoConquistas {
  novasConquistas: Conquista[];
  xpRecompensaTotal: number;
}

/**
 * [RF007, RF008] Avalia as métricas atuais do usuário contra o catálogo de conquistas,
 * desbloqueia as pendentes e concede as recompensas de XP no Firestore.
 */
export async function checkAndUnlockAchievements(
  usuarioId: string,
  stats: StatsUsuario,
  conquistasExistentes?: Conquista[],
  usuarioAtualXp: number = 0
): Promise<ResultadoProcessamentoConquistas> {
  if (!usuarioId) {
    return { novasConquistas: [], xpRecompensaTotal: 0 };
  }

  // 1. Obter conquistas já desbloqueadas caso não tenham sido passadas
  const desbloqueadas =
    conquistasExistentes ?? (await fetchUserAchievements(usuarioId));
  const idsDesbloqueados = new Set(desbloqueadas.map((c) => c.id));

  const novasConquistas: Conquista[] = [];
  let xpRecompensaTotal = 0;

  // 2. Verificar cada conquista do catálogo
  for (const def of CATALOGO_CONQUISTAS) {
    if (!idsDesbloqueados.has(def.id) && def.avaliar(stats)) {
      const novaConquista: Conquista = {
        id: def.id,
        usuarioId,
        nome: def.nome,
        descricao: def.descricao,
        icone: def.icone,
        categoria: def.categoria,
        recompensaXp: def.recompensaXp,
        dataConquista: new Date(),
        desbloqueada: true,
      };

      novasConquistas.push(novaConquista);
      xpRecompensaTotal += def.recompensaXp;

      // 3. Salvar conquista no Firestore na subcoleção do usuário
      try {
        const conquistaDocRef = doc(db, 'usuarios', usuarioId, 'conquistas', def.id);
        await setDoc(conquistaDocRef, {
          usuarioId,
          nome: def.nome,
          descricao: def.descricao,
          icone: def.icone,
          categoria: def.categoria,
          recompensaXp: def.recompensaXp,
          dataConquista: serverTimestamp(),
        });
      } catch (err) {
        console.warn(`Erro ao salvar conquista ${def.id}:`, err);
      }
    }
  }

  // 4. [RF007] Se houve recompensas de XP, atualizar XP e Nível do usuário no Firestore
  if (xpRecompensaTotal > 0) {
    try {
      const usuarioDocRef = doc(db, 'usuarios', usuarioId);
      const novoXpTotal = usuarioAtualXp + xpRecompensaTotal;
      const novoNivel = calcularNivel(novoXpTotal);

      await updateDoc(usuarioDocRef, {
        xpTotal: increment(xpRecompensaTotal),
        nivelAtual: novoNivel,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Erro ao creditar recompensa de XP do usuário:', err);
    }
  }

  return {
    novasConquistas,
    xpRecompensaTotal,
  };
}

/**
 * Mescla o catálogo completo com as conquistas desbloqueadas e calcula o progresso atual
 * de cada uma para renderização rica na UI [RF008].
 */
export function obterConquistasComProgresso(
  conquistasDesbloqueadas: Conquista[],
  stats: StatsUsuario
): ConquistaComProgresso[] {
  const mapaDesbloqueadas = new Map<string, Conquista>();
  conquistasDesbloqueadas.forEach((c) => {
    if (c.id) mapaDesbloqueadas.set(c.id, c);
  });

  return CATALOGO_CONQUISTAS.map((def) => {
    const salva = mapaDesbloqueadas.get(def.id);
    const desbloqueada = !!salva;
    const progressoAtual = desbloqueada ? def.alvo : def.obterProgresso(stats);
    const progressoPercentual = Math.min(
      100,
      Math.max(0, Math.floor((progressoAtual / def.alvo) * 100))
    );

    return {
      id: def.id,
      usuarioId: salva?.usuarioId,
      nome: def.nome,
      descricao: def.descricao,
      icone: def.icone,
      categoria: def.categoria,
      recompensaXp: def.recompensaXp,
      dataConquista: salva?.dataConquista || new Date(),
      alvo: def.alvo,
      progressoAtual,
      progressoPercentual,
      desbloqueada,
    };
  });
}
