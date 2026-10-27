import {
  obterUltimos7Dias,
  calcularMetricasLeitura,
} from '../../src/services/statsService';
import { SessaoLeitura } from '../../src/models/SessaoLeitura';

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
  getDocs: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

describe('statsService [RF009 - Relatórios e Métricas]', () => {
  const dataReferencia = new Date(2026, 9, 24); // 24 de Outubro de 2026 (Sábado)

  describe('obterUltimos7Dias', () => {
    it('deve retornar exatamente 7 dias ordenados cronologicamente', () => {
      const dias = obterUltimos7Dias(dataReferencia);
      expect(dias).toHaveLength(7);
      expect(dias[6].data).toBe('2026-10-24');
      expect(dias[0].data).toBe('2026-10-18');
    });
  });

  describe('calcularMetricasLeitura', () => {
    it('deve retornar métricas zeradas quando não há sessões', () => {
      const metricas = calcularMetricasLeitura([], 0, 0, dataReferencia);
      expect(metricas.totalPaginasLidas).toBe(0);
      expect(metricas.totalMinutosLidos).toBe(0);
      expect(metricas.totalLivrosConcluidos).toBe(0);
      expect(metricas.diasLidosNaSemana).toBe(0);
      expect(metricas.mediaPaginasPorDiaSemana).toBe(0);
      expect(metricas.diaMaisProdutivo).toBe('Nenhum');
      expect(metricas.leituraSemanal).toHaveLength(7);
    });

    it('deve consolidar páginas e minutos corretamente nas leituras semanais', () => {
      const sessoes: SessaoLeitura[] = [
        {
          id: 's1',
          itemEstanteId: 'item_1',
          data: new Date(2026, 9, 24),
          quantidade: 25,
          tipoUnidade: 'paginas',
          xpGanho: 125,
        },
        {
          id: 's2',
          itemEstanteId: 'item_1',
          data: new Date(2026, 9, 24),
          quantidade: 15,
          tipoUnidade: 'paginas',
          xpGanho: 75,
        },
        {
          id: 's3',
          itemEstanteId: 'item_2',
          data: new Date(2026, 9, 23),
          quantidade: 30,
          tipoUnidade: 'minutos',
          xpGanho: 45,
        },
      ];

      const metricas = calcularMetricasLeitura(sessoes, 2, 1, dataReferencia);

      expect(metricas.totalPaginasLidas).toBe(40);
      expect(metricas.totalMinutosLidos).toBe(30);
      expect(metricas.totalLivrosConcluidos).toBe(2);
      expect(metricas.totalLivrosLendo).toBe(1);
      expect(metricas.totalSessoes).toBe(3);
      expect(metricas.diasLidosNaSemana).toBe(2);
      expect(metricas.mediaPaginasPorDiaSemana).toBe(20); // 40 páginas / 2 dias lidos
      expect(metricas.diaMaisProdutivo).toContain('40 pág');
    });
  });
});
