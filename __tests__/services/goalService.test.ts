import {
  setUserGoal,
  fetchUserGoals,
  atualizarProgressoMetasSessao,
  formatarMesParaString,
} from '../../src/services/goalService';

import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
} from 'firebase/firestore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  initializeAuth: jest.fn(() => ({ currentUser: null })),
  getReactNativePersistence: jest.fn((storage) => storage),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ type: 'firestore' })),
  doc: jest.fn((...args) => ({ path: args.slice(1).join('/') })),
  collection: jest.fn((...args) => ({ path: args.slice(1).join('/') })),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  getDocs: jest.fn(),
  getDoc: jest.fn(() =>
    Promise.resolve({
      exists: () => false,
      id: 'mock_id',
      data: () => ({}),
    })
  ),
  serverTimestamp: jest.fn(() => 'TIMESTAMP_MOCK'),
}));

describe('goalService [RF010]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setUserGoal', () => {
    it('deve lançar erro se o valor alvo for menor ou igual a zero', async () => {
      await expect(setUserGoal('user_123', 'paginas_dia', 0)).rejects.toThrow(
        'O valor alvo da meta deve ser maior que zero.'
      );
    });

    it('deve lançar erro se o usuário não for informado', async () => {
      await expect(setUserGoal('', 'paginas_dia', 20)).rejects.toThrow(
        'ID do usuário é obrigatório para definir uma meta.'
      );
    });

    it('deve salvar uma meta diária com sucesso', async () => {
      const meta = await setUserGoal('user_123', 'paginas_dia', 25);

      expect(meta.usuarioId).toBe('user_123');
      expect(meta.tipoMeta).toBe('paginas_dia');
      expect(meta.valorAlvo).toBe(25);
      expect(meta.progressoAtual).toBe(0);
      expect(meta.atingida).toBe(false);
      expect(setDoc).toHaveBeenCalled();
    });

    it('deve preservar progresso existente do período corrente ao atualizar o valor alvo', async () => {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const dia = String(hoje.getDate()).padStart(2, '0');
      const hojeStr = `${ano}-${mes}-${dia}`;

      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        id: 'meta_diaria_paginas',
        data: () => ({
          usuarioId: 'user_123',
          tipoMeta: 'paginas_dia',
          valorAlvo: 20,
          progressoAtual: 14,
          atingida: false,
          periodo: hojeStr,
        }),
      });

      const meta = await setUserGoal('user_123', 'paginas_dia', 30);

      expect(meta.valorAlvo).toBe(30);
      expect(meta.progressoAtual).toBe(14);
      expect(meta.atingida).toBe(false);
      expect(setDoc).toHaveBeenCalled();
    });

    it('deve salvar uma meta mensal com sucesso', async () => {
      const meta = await setUserGoal('user_123', 'livros_mes', 3);

      expect(meta.tipoMeta).toBe('livros_mes');
      expect(meta.valorAlvo).toBe(3);
      expect(setDoc).toHaveBeenCalled();
    });
  });

  describe('atualizarProgressoMetasSessao', () => {
    it('deve atualizar o progresso de páginas da meta diária', async () => {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const dia = String(hoje.getDate()).padStart(2, '0');
      const hojeStr = `${ano}-${mes}-${dia}`;

      const metasAtuais = {
        metaDiaria: {
          id: 'meta_diaria_paginas',
          usuarioId: 'user_123',
          tipoMeta: 'paginas_dia' as const,
          valorAlvo: 20,
          progressoAtual: 10,
          atingida: false,
          periodo: hojeStr,
        },
      };

      const resultado = await atualizarProgressoMetasSessao(
        'user_123',
        15, // leu mais 15 páginas hoje (total 25, atinge a meta de 20)
        false,
        metasAtuais
      );

      expect(resultado.metasAtualizadas.length).toBe(1);
      expect(resultado.metasAtualizadas[0].progressoAtual).toBe(25);
      expect(resultado.metasAtualizadas[0].atingida).toBe(true);
      expect(resultado.metaAtingidaAgora).toBe(true);
      expect(setDoc).toHaveBeenCalled();
    });

    it('deve atualizar o progresso de livros da meta mensal se o livro foi concluído', async () => {
      const mesStr = formatarMesParaString(new Date());

      const metasAtuais = {
        metaMensal: {
          id: 'meta_mensal_livros',
          usuarioId: 'user_123',
          tipoMeta: 'livros_mes' as const,
          valorAlvo: 2,
          progressoAtual: 1,
          atingida: false,
          periodo: mesStr,
        },
      };

      const resultado = await atualizarProgressoMetasSessao(
        'user_123',
        30,
        true, // concluiu o livro!
        metasAtuais
      );

      expect(resultado.metasAtualizadas.length).toBe(1);
      expect(resultado.metasAtualizadas[0].progressoAtual).toBe(2);
      expect(resultado.metasAtualizadas[0].atingida).toBe(true);
      expect(resultado.metaAtingidaAgora).toBe(true);
    });

    it('não deve atualizar a meta mensal se nenhum livro foi concluído', async () => {
      const mesStr = formatarMesParaString(new Date());

      const metasAtuais = {
        metaMensal: {
          id: 'meta_mensal_livros',
          usuarioId: 'user_123',
          tipoMeta: 'livros_mes' as const,
          valorAlvo: 2,
          progressoAtual: 0,
          atingida: false,
          periodo: mesStr,
        },
      };

      const resultado = await atualizarProgressoMetasSessao(
        'user_123',
        30,
        false, // não concluiu o livro
        metasAtuais
      );

      expect(resultado.metasAtualizadas.length).toBe(0);
      expect(resultado.metaAtingidaAgora).toBe(false);
    });
  });
});
