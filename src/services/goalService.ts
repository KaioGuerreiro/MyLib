import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Meta, TipoMeta } from '../models/Meta';
import { formatarDataParaString } from '../utils/gamification';

/**
 * Retorna o período do mês corrente no formato 'YYYY-MM'
 */
export function formatarMesParaString(data: Date = new Date()): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
}

export const META_DOC_IDS = {
  PAGINAS_DIA: 'meta_diaria_paginas',
  LIVROS_MES: 'meta_mensal_livros',
};

function parseMetaDoc(id: string, data: DocumentData): Meta {
  const dataCriacao =
    typeof data.dataCriacao?.toDate === 'function'
      ? data.dataCriacao.toDate()
      : data.dataCriacao
      ? new Date(data.dataCriacao)
      : new Date();

  return {
    id,
    usuarioId: data.usuarioId || '',
    tipoMeta: data.tipoMeta as TipoMeta,
    valorAlvo: Number(data.valorAlvo) || 0,
    progressoAtual: Number(data.progressoAtual) || 0,
    atingida: Boolean(data.atingida),
    periodo: data.periodo || '',
    dataCriacao,
  };
}

export interface MetasUsuario {
  metaDiaria?: Meta;
  metaMensal?: Meta;
}

/**
 * [RF010] Busca as metas configuradas do usuário, ajustando o progresso para o período atual
 * (reseta contagem diária se mudou de dia, ou mensal se mudou de mês).
 */
export async function fetchUserGoals(usuarioId: string): Promise<MetasUsuario> {
  if (!usuarioId) return {};

  try {
    const metasRef = collection(db, 'usuarios', usuarioId, 'metas');
    const snapshot = await getDocs(metasRef);

    const hojeStr = formatarDataParaString(new Date());
    const mesStr = formatarMesParaString(new Date());

    let metaDiaria: Meta | undefined;
    let metaMensal: Meta | undefined;

    snapshot.docs.forEach((docSnap) => {
      const meta = parseMetaDoc(docSnap.id, docSnap.data());
      if (meta.tipoMeta === 'paginas_dia') {
        // Se a meta foi registrada em outro dia, o progresso do dia atual zera
        if (meta.periodo !== hojeStr) {
          meta.progressoAtual = 0;
          meta.atingida = false;
          meta.periodo = hojeStr;
        }
        metaDiaria = meta;
      } else if (meta.tipoMeta === 'livros_mes') {
        // Se o mês mudou, o progresso do mês atual zera
        if (meta.periodo !== mesStr) {
          meta.progressoAtual = 0;
          meta.atingida = false;
          meta.periodo = mesStr;
        }
        metaMensal = meta;
      }
    });

    return { metaDiaria, metaMensal };
  } catch (err) {
    console.warn('Erro ao buscar metas do usuário:', err);
    return {};
  }
}

/**
 * [RF010] Define ou atualiza uma meta de leitura para o usuário.
 *
 * Ao ajustar uma meta já existente, o progresso do período corrente (dia ou mês)
 * e a data de criação original são preservados. Se `progressoAtual` for informado
 * explicitamente, ele tem precedência.
 */
export async function setUserGoal(
  usuarioId: string,
  tipoMeta: TipoMeta,
  valorAlvo: number,
  progressoAtual?: number
): Promise<Meta> {
  if (!usuarioId) {
    throw new Error('ID do usuário é obrigatório para definir uma meta.');
  }

  if (valorAlvo <= 0) {
    throw new Error('O valor alvo da meta deve ser maior que zero.');
  }

  const docId =
    tipoMeta === 'paginas_dia' ? META_DOC_IDS.PAGINAS_DIA : META_DOC_IDS.LIVROS_MES;
  const periodo =
    tipoMeta === 'paginas_dia'
      ? formatarDataParaString(new Date())
      : formatarMesParaString(new Date());

  const metaDocRef = doc(db, 'usuarios', usuarioId, 'metas', docId);

  // Recupera a meta existente para não perder o progresso já feito no período
  let progressoFinal = progressoAtual ?? 0;
  let metaJaExiste = false;
  let dataCriacaoExistente: Date | undefined;
  if (progressoAtual === undefined) {
    const existenteSnap = await getDoc(metaDocRef);
    if (existenteSnap.exists()) {
      metaJaExiste = true;
      const existente = parseMetaDoc(existenteSnap.id, existenteSnap.data());
      dataCriacaoExistente = existente.dataCriacao;
      if (existente.periodo === periodo) {
        progressoFinal = existente.progressoAtual;
      }
    }
  }

  const atingida = progressoFinal >= valorAlvo;

  const novaMeta: Meta = {
    id: docId,
    usuarioId,
    tipoMeta,
    valorAlvo,
    progressoAtual: progressoFinal,
    atingida,
    periodo,
    dataCriacao: dataCriacaoExistente ?? new Date(),
  };

  await setDoc(
    metaDocRef,
    {
      usuarioId,
      tipoMeta,
      valorAlvo,
      progressoAtual: progressoFinal,
      atingida,
      periodo,
      updatedAt: serverTimestamp(),
      ...(metaJaExiste ? {} : { dataCriacao: serverTimestamp() }),
    },
    { merge: true }
  );

  return novaMeta;
}

export interface ResultadoAtualizacaoMetas {
  metasAtualizadas: Meta[];
  metaAtingidaAgora: boolean;
}

/**
 * [RF010] Atualiza o progresso das metas do usuário após o registro de uma sessão de leitura.
 */
export async function atualizarProgressoMetasSessao(
  usuarioId: string,
  paginasLidasAdicionais: number,
  concluiuLivro: boolean,
  metasAtuais?: MetasUsuario
): Promise<ResultadoAtualizacaoMetas> {
  if (!usuarioId) {
    return { metasAtualizadas: [], metaAtingidaAgora: false };
  }

  const metas = metasAtuais || (await fetchUserGoals(usuarioId));
  const hojeStr = formatarDataParaString(new Date());
  const mesStr = formatarMesParaString(new Date());

  const metasAtualizadas: Meta[] = [];
  let metaAtingidaAgora = false;

  // 1. Atualizar meta diária de páginas
  if (metas.metaDiaria && paginasLidasAdicionais > 0) {
    const m = metas.metaDiaria;
    const progressoBase = m.periodo === hojeStr ? m.progressoAtual : 0;
    const novoProgresso = progressoBase + paginasLidasAdicionais;
    const agoraAtingida = novoProgresso >= m.valorAlvo;

    if (!m.atingida && agoraAtingida) {
      metaAtingidaAgora = true;
    }

    const metaDiariaAtualizada: Meta = {
      ...m,
      progressoAtual: novoProgresso,
      atingida: agoraAtingida,
      periodo: hojeStr,
    };

    metasAtualizadas.push(metaDiariaAtualizada);

    try {
      const docRef = doc(db, 'usuarios', usuarioId, 'metas', META_DOC_IDS.PAGINAS_DIA);
      await setDoc(
        docRef,
        {
          progressoAtual: novoProgresso,
          atingida: agoraAtingida,
          periodo: hojeStr,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Erro ao atualizar meta diária:', err);
    }
  }

  // 2. Atualizar meta mensal de livros (se um livro foi finalizado)
  if (metas.metaMensal && concluiuLivro) {
    const m = metas.metaMensal;
    const progressoBase = m.periodo === mesStr ? m.progressoAtual : 0;
    const novoProgresso = progressoBase + 1;
    const agoraAtingida = novoProgresso >= m.valorAlvo;

    if (!m.atingida && agoraAtingida) {
      metaAtingidaAgora = true;
    }

    const metaMensalAtualizada: Meta = {
      ...m,
      progressoAtual: novoProgresso,
      atingida: agoraAtingida,
      periodo: mesStr,
    };

    metasAtualizadas.push(metaMensalAtualizada);

    try {
      const docRef = doc(db, 'usuarios', usuarioId, 'metas', META_DOC_IDS.LIVROS_MES);
      await setDoc(
        docRef,
        {
          progressoAtual: novoProgresso,
          atingida: agoraAtingida,
          periodo: mesStr,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Erro ao atualizar meta mensal:', err);
    }
  }

  return {
    metasAtualizadas,
    metaAtingidaAgora,
  };
}
