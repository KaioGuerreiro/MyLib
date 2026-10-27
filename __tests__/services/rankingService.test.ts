import {
  sincronizarRankingUsuario,
  fetchRanking,
  removerUsuarioDoRanking,
} from '../../src/services/rankingService';

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
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
  deleteDoc: jest.fn(() => Promise.resolve()),
  getDocs: jest.fn(),
  query: jest.fn((ref) => ref),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => 'TIMESTAMP_MOCK'),
}));

describe('rankingService [Módulo 5 - Social & Leaderboard]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sincronizarRankingUsuario', () => {
    it('deve salvar o perfil do leitor na coleção pública de ranking', async () => {
      await sincronizarRankingUsuario({
        id: 'usr_123',
        nome: 'Kaio Guerreiro',
        xpTotal: 450,
        nivelAtual: 3,
        ofensivaAtual: 7,
        avatarId: 'wizard',
      });

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'ranking/usr_123' }),
        expect.objectContaining({
          id: 'usr_123',
          nome: 'Kaio Guerreiro',
          xpTotal: 450,
          nivelAtual: 3,
          ofensivaAtual: 7,
          avatarId: 'wizard',
        }),
        { merge: true }
      );
    });
  });

  describe('fetchRanking', () => {
    it('deve retornar lista classificada com posições calculadas', async () => {
      (getDocs as jest.Mock).mockResolvedValueOnce({
        docs: [
          {
            id: 'u1',
            data: () => ({ nome: 'Alice', xpTotal: 1000, nivelAtual: 5, ofensivaAtual: 10 }),
          },
          {
            id: 'u2',
            data: () => ({ nome: 'Bob', xpTotal: 800, nivelAtual: 4, ofensivaAtual: 5 }),
          },
        ],
      });

      const ranking = await fetchRanking('xp', 10);
      expect(ranking).toHaveLength(2);
      expect(ranking[0].posicao).toBe(1);
      expect(ranking[0].nome).toBe('Alice');
      expect(ranking[1].posicao).toBe(2);
      expect(ranking[1].nome).toBe('Bob');
    });
  });

  describe('removerUsuarioDoRanking', () => {
    it('deve excluir o documento do ranking ao deletar conta', async () => {
      await removerUsuarioDoRanking('usr_123');
      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'ranking/usr_123' })
      );
    });
  });
});
