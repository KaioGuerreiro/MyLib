import { TipoUnidade } from '../models/SessaoLeitura';
export type { TipoUnidade };

// Constantes de balanceamento de XP
export const XP_CONFIG = {
  XP_POR_PAGINA: 5,
  XP_POR_MINUTO: 3,
  BONUS_PRIMEIRA_LEITURA_DIA: 20,
  BONUS_CONCLUSAO_LIVRO: 100,
  MAX_PERCENTUAL_BONUS_STREAK: 0.5, // 50% de bônus máximo
  PERCENTUAL_BONUS_POR_DIA_STREAK: 0.05, // +5% por dia de streak
};

// Títulos literários por nível
export const TITULOS_NIVEL: Record<number, string> = {
  1: 'Novato das Letras',
  2: 'Leitor Curioso',
  3: 'Explorador de Páginas',
  4: 'Leitor Dedicado',
  5: 'Devorador de Livros',
  6: 'Mestre da Leitura',
  7: 'Guardião dos Tomos',
  8: 'Sábio da Biblioteca',
  9: 'Erudito Lendário',
  10: 'Arquimago Literário',
};

/**
 * Retorna a data no formato ISO 'YYYY-MM-DD' considerando o fuso horário local.
 */
export function formatarDataParaString(data: Date = new Date()): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Calcula a diferença em dias corridos entre duas datas em formato 'YYYY-MM-DD'.
 * Retorna (data2 - data1) em dias inteiros.
 */
export function calcularDiferencaDias(dataStr1: string, dataStr2: string): number {
  const [ano1, mes1, dia1] = dataStr1.split('-').map(Number);
  const [ano2, mes2, dia2] = dataStr2.split('-').map(Number);

  const utc1 = Date.UTC(ano1, mes1 - 1, dia1);
  const utc2 = Date.UTC(ano2, mes2 - 1, dia2);

  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.floor((utc2 - utc1) / msPorDia);
}

export interface ResultadoOfensiva {
  novaOfensiva: number;
  streakMantido: boolean;
  jaLeuHoje: boolean;
  streakIncrementado: boolean;
  streakResetado: boolean;
}

/**
 * [RF004] Calcula a nova ofensiva (streak) quando o usuário registra uma sessão de leitura.
 *
 * Regras de negócio:
 * - Se não havia data anterior: ofensiva inicia em 1.
 * - Se a última leitura foi hoje (diferença = 0): mantém a ofensiva atual (não incrementa de novo hoje).
 * - Se a última leitura foi ontem (diferença = 1): ofensiva incrementa em 1.
 * - Se a última leitura foi há 2 ou mais dias (diferença >= 2): ofensiva quebrou e reinicia em 1.
 */
export function calcularNovaOfensiva(
  ultimaLeituraData?: string | null,
  ofensivaAtual: number = 0,
  agora: Date = new Date()
): ResultadoOfensiva {
  const hojeStr = formatarDataParaString(agora);

  if (!ultimaLeituraData) {
    return {
      novaOfensiva: 1,
      streakMantido: false,
      jaLeuHoje: false,
      streakIncrementado: true,
      streakResetado: false,
    };
  }

  const diffDias = calcularDiferencaDias(ultimaLeituraData, hojeStr);

  if (diffDias <= 0) {
    // Mesma data de leitura (já leu hoje)
    return {
      novaOfensiva: Math.max(1, ofensivaAtual),
      streakMantido: true,
      jaLeuHoje: true,
      streakIncrementado: false,
      streakResetado: false,
    };
  }

  if (diffDias === 1) {
    // Leu ontem consecutivamente
    return {
      novaOfensiva: Math.max(0, ofensivaAtual) + 1,
      streakMantido: true,
      jaLeuHoje: false,
      streakIncrementado: true,
      streakResetado: false,
    };
  }

  // Ficou 1 dia inteiro ou mais sem ler (quebrou o streak)
  return {
    novaOfensiva: 1,
    streakMantido: false,
    jaLeuHoje: false,
    streakIncrementado: true,
    streakResetado: true,
  };
}

/**
 * [RF004] Retorna o streak atualizado considerando a inatividade.
 * Se a última leitura foi há 2 ou mais dias e nenhuma sessão foi registrada hoje,
 * o streak visível é 0 (quebrado).
 */
export function obterOfensivaAtualizada(
  ultimaLeituraData?: string | null,
  ofensivaAtual: number = 0,
  agora: Date = new Date()
): number {
  if (!ultimaLeituraData || ofensivaAtual <= 0) return 0;

  const hojeStr = formatarDataParaString(agora);
  const diffDias = calcularDiferencaDias(ultimaLeituraData, hojeStr);

  // Se a última leitura foi ontem ou hoje, o streak continua ativo
  if (diffDias <= 1) {
    return ofensivaAtual;
  }

  // Mais de 1 dia se passou desde a última leitura, streak zerou
  return 0;
}

export interface ParametrosCalculoXp {
  quantidade: number;
  tipoUnidade: TipoUnidade;
  streakAtual?: number;
  isFirstSessionOfDay?: boolean;
  concluiuLivro?: boolean;
}

export interface DetalhesXpGanho {
  xpBase: number;
  bonusStreak: number;
  bonusDiario: number;
  bonusConclusao: number;
  xpTotal: number;
}

/**
 * [RF005] Atribuição de XP com base na constância e progresso.
 *
 * Regras de negócio:
 * - Progresso base: 5 XP por página lida ou 3 XP por minuto lido.
 * - Bônus de constância (Streak): +5% por dia de streak atual (até teto de 50%).
 * - Bônus diário: +20 XP se for a primeira sessão registrada no dia.
 * - Bônus de conclusão: +100 XP se a sessão concluiu o livro.
 */
export function calcularXpSessao(params: ParametrosCalculoXp): DetalhesXpGanho {
  const {
    quantidade,
    tipoUnidade,
    streakAtual = 0,
    isFirstSessionOfDay = false,
    concluiuLivro = false,
  } = params;

  if (quantidade <= 0) {
    return {
      xpBase: 0,
      bonusStreak: 0,
      bonusDiario: 0,
      bonusConclusao: 0,
      xpTotal: 0,
    };
  }

  const taxaPorUnidade =
    tipoUnidade === 'paginas' ? XP_CONFIG.XP_POR_PAGINA : XP_CONFIG.XP_POR_MINUTO;
  const xpBase = Math.round(quantidade * taxaPorUnidade);

  // Multiplicador de streak limitado ao máximo de 50%
  const percentualBonusStreak = Math.min(
    Math.max(0, streakAtual) * XP_CONFIG.PERCENTUAL_BONUS_POR_DIA_STREAK,
    XP_CONFIG.MAX_PERCENTUAL_BONUS_STREAK
  );
  const bonusStreak = Math.round(xpBase * percentualBonusStreak);

  // Bônus fixos
  const bonusDiario = isFirstSessionOfDay ? XP_CONFIG.BONUS_PRIMEIRA_LEITURA_DIA : 0;
  const bonusConclusao = concluiuLivro ? XP_CONFIG.BONUS_CONCLUSAO_LIVRO : 0;

  const xpTotal = xpBase + bonusStreak + bonusDiario + bonusConclusao;

  return {
    xpBase,
    bonusStreak,
    bonusDiario,
    bonusConclusao,
    xpTotal,
  };
}

/**
 * [RF006] Retorna a quantidade total de XP acumulado necessária para atingir determinado nível.
 * Fórmula quadrática: XP(n) = 50 * n * (n - 1)
 *
 * Nível 1: 0 XP
 * Nível 2: 100 XP
 * Nível 3: 300 XP
 * Nível 4: 600 XP
 * Nível 5: 1000 XP
 */
export function xpNecessarioParaNivel(nivel: number): number {
  if (nivel <= 1) return 0;
  return 50 * nivel * (nivel - 1);
}

/**
 * [RF006] Calcula o nível do usuário a partir do XP acumulado total.
 * Inverso da fórmula quadrática via fórmula de Bhaskara:
 * 50n² - 50n - xp = 0  =>  n = (1 + sqrt(1 + 0.08 * xp)) / 2
 */
export function calcularNivel(xpTotal: number): number {
  if (xpTotal <= 0) return 1;
  const nivel = Math.floor((1 + Math.sqrt(1 + 0.08 * xpTotal)) / 2);
  return Math.max(1, nivel);
}

export interface ProgressoNivel {
  nivel: number;
  xpTotal: number;
  xpInicioNivel: number;
  xpFimNivel: number;
  xpAtualNoNivel: number;
  xpParaProximoNivel: number;
  xpRestante: number;
  percentual: number;
  tituloNivel: string;
}

/**
 * [RF006] Calcula os detalhes de progresso do nível atual para exibição de barra de status e métricas.
 */
export function calcularProgressoNivel(xpTotal: number): ProgressoNivel {
  const xpValido = Math.max(0, xpTotal || 0);
  const nivel = calcularNivel(xpValido);

  const xpInicioNivel = xpNecessarioParaNivel(nivel);
  const xpFimNivel = xpNecessarioParaNivel(nivel + 1);

  const xpAtualNoNivel = xpValido - xpInicioNivel;
  const xpParaProximoNivel = xpFimNivel - xpInicioNivel;
  const xpRestante = Math.max(0, xpFimNivel - xpValido);

  const percentual = Math.min(
    100,
    Math.max(0, Math.floor((xpAtualNoNivel / xpParaProximoNivel) * 100))
  );

  const tituloNivel = TITULOS_NIVEL[nivel] || TITULOS_NIVEL[10];

  return {
    nivel,
    xpTotal: xpValido,
    xpInicioNivel,
    xpFimNivel,
    xpAtualNoNivel,
    xpParaProximoNivel,
    xpRestante,
    percentual,
    tituloNivel,
  };
}
