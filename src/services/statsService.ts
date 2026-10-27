import { collection, getDocs, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SessaoLeitura } from '../models/SessaoLeitura';
import { MetricasLeitura, LeituraDiaria } from '../models/EstatisticasLeitura';
import { formatarDataParaString } from '../utils/gamification';

const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Calcula os últimos 7 dias a partir da data de referência (do mais antigo ao mais recente).
 */
export function obterUltimos7Dias(dataReferencia: Date = new Date()): { data: string; diaSemana: string }[] {
  const dias: { data: string; diaSemana: string }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(dataReferencia);
    d.setDate(dataReferencia.getDate() - i);
    dias.push({
      data: formatarDataParaString(d),
      diaSemana: DIAS_SEMANA_ABREV[d.getDay()],
    });
  }

  return dias;
}

/**
 * [RF009] Calcula as métricas consolidadas e o histórico semanal de leitura.
 * Função pura e determinística ideal para testes unitários com Jest.
 */
export function calcularMetricasLeitura(
  sessoes: SessaoLeitura[],
  totalLivrosConcluidos: number = 0,
  totalLivrosLendo: number = 0,
  dataReferencia: Date = new Date()
): MetricasLeitura {
  const ultimos7Dias = obterUltimos7Dias(dataReferencia);
  const mapaSemanal: Record<string, { paginas: number; minutos: number; xp: number }> = {};

  ultimos7Dias.forEach(({ data }) => {
    mapaSemanal[data] = { paginas: 0, minutos: 0, xp: 0 };
  });

  let totalPaginasLidas = 0;
  let totalMinutosLidos = 0;

  sessoes.forEach((sessao) => {
    const dataObj = sessao.data instanceof Date ? sessao.data : new Date(sessao.data);
    const dataStr = formatarDataParaString(dataObj);

    if (sessao.tipoUnidade === 'paginas') {
      totalPaginasLidas += sessao.quantidade;
    } else if (sessao.tipoUnidade === 'minutos') {
      totalMinutosLidos += sessao.quantidade;
    }

    if (mapaSemanal[dataStr]) {
      if (sessao.tipoUnidade === 'paginas') {
        mapaSemanal[dataStr].paginas += sessao.quantidade;
      } else if (sessao.tipoUnidade === 'minutos') {
        mapaSemanal[dataStr].minutos += sessao.quantidade;
      }
      mapaSemanal[dataStr].xp += sessao.xpGanho || 0;
    }
  });

  const leituraSemanal: LeituraDiaria[] = ultimos7Dias.map(({ data, diaSemana }) => ({
    diaSemana,
    data,
    paginas: mapaSemanal[data]?.paginas || 0,
    minutos: mapaSemanal[data]?.minutos || 0,
    xp: mapaSemanal[data]?.xp || 0,
  }));

  const diasComLeitura = leituraSemanal.filter((d) => d.paginas > 0 || d.minutos > 0).length;
  const paginasSemana = leituraSemanal.reduce((acc, curr) => acc + curr.paginas, 0);
  const mediaPaginasPorDiaSemana = diasComLeitura > 0 ? Math.round(paginasSemana / diasComLeitura) : 0;

  // Identifica o dia mais produtivo da semana
  let diaMaisProdutivo = 'Nenhum';
  let maxVolume = 0;
  leituraSemanal.forEach((d) => {
    const volume = d.paginas + d.minutos;
    if (volume > maxVolume) {
      maxVolume = volume;
      diaMaisProdutivo = `${d.diaSemana} (${d.paginas > 0 ? `${d.paginas} pág` : `${d.minutos} min`})`;
    }
  });

  return {
    totalPaginasLidas,
    totalMinutosLidos,
    totalLivrosConcluidos,
    totalLivrosLendo,
    totalSessoes: sessoes.length,
    diasLidosNaSemana: diasComLeitura,
    mediaPaginasPorDiaSemana,
    diaMaisProdutivo,
    leituraSemanal,
  };
}

/**
 * [RF009] Busca o histórico e gera as métricas completas do usuário a partir do Firestore.
 */
export async function fetchUserStats(usuarioId: string): Promise<MetricasLeitura> {
  if (!usuarioId) {
    return calcularMetricasLeitura([], 0, 0);
  }

  try {
    // 1. Buscar sessões
    const sessoesRef = collection(db, 'usuarios', usuarioId, 'sessoes');
    const sessoesQuery = query(sessoesRef, orderBy('data', 'desc'), firestoreLimit(100));
    const sessoesSnap = await getDocs(sessoesQuery);

    const sessoes: SessaoLeitura[] = sessoesSnap.docs.map((d) => {
      const data = d.data();
      const dataDate =
        typeof data.data?.toDate === 'function'
          ? data.data.toDate()
          : data.data
          ? new Date(data.data)
          : new Date();

      return {
        id: d.id,
        usuarioId: data.usuarioId || usuarioId,
        itemEstanteId: data.itemEstanteId || '',
        livroId: data.livroId || '',
        livroTitulo: data.livroTitulo || '',
        data: dataDate,
        quantidade: Number(data.quantidade) || 0,
        tipoUnidade: data.tipoUnidade || 'paginas',
        xpGanho: Number(data.xpGanho) || 0,
      };
    });

    // 2. Buscar contadores da estante
    const estanteRef = collection(db, 'usuarios', usuarioId, 'estante');
    const estanteSnap = await getDocs(estanteRef);

    let totalLivrosConcluidos = 0;
    let totalLivrosLendo = 0;

    estanteSnap.docs.forEach((d) => {
      const item = d.data();
      if (item.status === 'LIDO') {
        totalLivrosConcluidos++;
      } else if (item.status === 'LENDO') {
        totalLivrosLendo++;
      }
    });

    return calcularMetricasLeitura(sessoes, totalLivrosConcluidos, totalLivrosLendo);
  } catch (err) {
    console.warn('Erro ao carregar estatísticas do usuário:', err);
    return calcularMetricasLeitura([], 0, 0);
  }
}
