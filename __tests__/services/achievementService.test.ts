import {
  checkAndUnlockAchievements,
  obterConquistasComProgresso,
  CATALOGO_CONQUISTAS,
  fetchUserAchievements,
} from '../../src/services/achievementService';
import { Conquista } from '../../src/models/Conquista';

import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  increment,
  serverTimestamp,
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
  increment: jest.fn((val) => val),
  serverTimestamp: jest.fn(() => 'TIMESTAMP_MOCK'),
}));

describe('achievementService [RF007, RF008]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CATALOGO_CONQUISTAS', () => {
    it('deve conter medalhas balanceadas para todas as categorias', () => {
      expect(CATALOGO_CONQUISTAS.length).toBeGreaterThanOrEqual(10);

      const categorias = new Set(CATALOGO_CONQUISTAS.map((c) => c.categoria));
      expect(categorias.has('streak')).toBe(true);
      expect(categorias.has('livros')).toBe(true);
      expect(categorias.has('paginas')).toBe(true);
      expect(categorias.has('geral')).toBe(true);
    });

    it('cada conquista deve ter recompensa de XP positiva', () => {
      CATALOGO_CONQUISTAS.forEach((conquista) => {
        expect(conquista.recompensaXp).toBeGreaterThan(0);
        expect(conquista.alvo).toBeGreaterThan(0);
        expect(typeof conquista.nome).toBe('string');
        expect(typeof conquista.descricao).toBe('string');
      });
    });
  });

  describe('checkAndUnlockAchievements', () => {
    it('deve desbloquear a primeira centelha quando o usuário atinge streak 1', async () => {
      const stats = {
        streakAtual: 1,
        livrosLidosTotal: 0,
        paginasLidasTotal: 10,
        nivelAtual: 1,
      };

      const resultado = await checkAndUnlockAchievements(
        'user_123',
        stats,
        [], // nenhuma conquista prévia
        0
      );

      expect(resultado.novasConquistas.length).toBeGreaterThan(0);
      const centelha = resultado.novasConquistas.find((c) => c.id === 'streak_1');
      expect(centelha).toBeDefined();
      expect(centelha?.nome).toBe('Primeira Centelha');
      expect(resultado.xpRecompensaTotal).toBeGreaterThanOrEqual(50);
      expect(setDoc).toHaveBeenCalled();
    });

    it('não deve desbloquear conquistas que o usuário já possui', async () => {
      const conquistasExistentes: Conquista[] = [
        {
          id: 'streak_1',
          usuarioId: 'user_123',
          nome: 'Primeira Centelha',
          descricao: 'Inicie sua jornada',
          dataConquista: new Date(),
        },
      ];

      const stats = {
        streakAtual: 1,
        livrosLidosTotal: 0,
        paginasLidasTotal: 10,
        nivelAtual: 1,
      };

      const resultado = await checkAndUnlockAchievements(
        'user_123',
        stats,
        conquistasExistentes,
        100
      );

      const centelha = resultado.novasConquistas.find((c) => c.id === 'streak_1');
      expect(centelha).toBeUndefined();
    });

    it('deve desbloquear múltiplas conquistas correspondentes simultaneamente', async () => {
      const stats = {
        streakAtual: 3,
        livrosLidosTotal: 1,
        paginasLidasTotal: 50,
        nivelAtual: 1,
      };

      const resultado = await checkAndUnlockAchievements(
        'user_123',
        stats,
        [],
        0
      );

      const ids = resultado.novasConquistas.map((c) => c.id);
      expect(ids).toContain('streak_1');
      expect(ids).toContain('streak_3');
      expect(ids).toContain('livro_1');
      expect(ids).toContain('paginas_50');
      expect(resultado.xpRecompensaTotal).toBe(375);
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('obterConquistasComProgresso', () => {
    it('deve mesclar conquistas salvas com metas pendentes calculando porcentagem', () => {
      const conquistasDesbloqueadas: Conquista[] = [
        {
          id: 'streak_1',
          usuarioId: 'user_123',
          nome: 'Primeira Centelha',
          descricao: 'Inicie sua jornada',
          dataConquista: new Date(),
        },
      ];

      const stats = {
        streakAtual: 2, // 2 de 3 dias para streak_3
        livrosLidosTotal: 0,
        paginasLidasTotal: 25, // 25 de 50 para paginas_50
        nivelAtual: 1,
      };

      const lista = obterConquistasComProgresso(conquistasDesbloqueadas, stats);

      expect(lista.length).toBe(CATALOGO_CONQUISTAS.length);

      const streak1 = lista.find((c) => c.id === 'streak_1');
      expect(streak1?.desbloqueada).toBe(true);
      expect(streak1?.progressoPercentual).toBe(100);

      const streak3 = lista.find((c) => c.id === 'streak_3');
      expect(streak3?.desbloqueada).toBe(false);
      expect(streak3?.progressoAtual).toBe(2);
      expect(streak3?.progressoPercentual).toBe(66);

      const paginas50 = lista.find((c) => c.id === 'paginas_50');
      expect(paginas50?.desbloqueada).toBe(false);
      expect(paginas50?.progressoAtual).toBe(25);
      expect(paginas50?.progressoPercentual).toBe(50);
    });
  });
});
