import {
  registrarSessaoLeitura,
  fetchUserSessions,
  sincronizarOfensivaUsuario,
} from '../../src/services/readingSessionService';

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
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
  addDoc: jest.fn(() => Promise.resolve({ id: 'sessao_123' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  getDocs: jest.fn(),
  query: jest.fn((ref) => ref),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => 'TIMESTAMP_MOCK'),
  Timestamp: {
    fromDate: jest.fn((d) => ({ toDate: () => d })),
  },
}));

describe('readingSessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('[RF003] registrarSessaoLeitura', () => {
    it('deve lançar erro se a quantidade for menor ou igual a zero', async () => {
      await expect(
        registrarSessaoLeitura({
          usuarioId: 'user_1',
          itemEstanteId: 'item_1',
          livroId: 'book_1',
          livroTitulo: 'Dom Casmurro',
          totalPaginasLivro: 200,
          progressoAtualLivro: 50,
          quantidade: 0,
          tipoUnidade: 'paginas',
          usuarioAtual: {
            xpTotal: 100,
            nivelAtual: 2,
            ofensivaAtual: 1,
            ultimaLeituraData: null,
          },
        })
      ).rejects.toThrow('A quantidade lida deve ser maior que zero.');
    });

    it('deve registrar uma sessão de páginas com sucesso e atualizar estante e usuário', async () => {
      const resultado = await registrarSessaoLeitura({
        usuarioId: 'user_1',
        itemEstanteId: 'item_1',
        livroId: 'book_1',
        livroTitulo: 'Dom Casmurro',
        totalPaginasLivro: 200,
        progressoAtualLivro: 50,
        quantidade: 20,
        tipoUnidade: 'paginas',
        usuarioAtual: {
          xpTotal: 0,
          nivelAtual: 1,
          ofensivaAtual: 0,
          ultimaLeituraData: null,
        },
      });

      // Validar retorno
      expect(resultado.sessaoId).toBe('sessao_123');
      // 20 páginas * 5 XP = 100 XP base + 20 XP primeira sessão = 120 XP
      expect(resultado.xpGanho).toBe(120);
      expect(resultado.novoXpTotal).toBe(120);
      expect(resultado.novoNivel).toBe(2); // 120 XP atinge nível 2 (que requer 100)
      expect(resultado.subiuDeNivel).toBe(true);
      expect(resultado.novaOfensiva).toBe(1);
      expect(resultado.concluiuLivro).toBe(false);
      expect(resultado.novoProgressoPaginas).toBe(70);

      // Validar chamadas ao Firestore
      expect(addDoc).toHaveBeenCalledTimes(1);
      expect(updateDoc).toHaveBeenCalledTimes(2); // 1 para o item da estante, 1 para o usuário
    });

    it('deve concluir o livro e atribuir bônus de 100 XP quando atingir o total de páginas', async () => {
      const resultado = await registrarSessaoLeitura({
        usuarioId: 'user_1',
        itemEstanteId: 'item_1',
        livroId: 'book_1',
        livroTitulo: 'O Pequeno Príncipe',
        totalPaginasLivro: 100,
        progressoAtualLivro: 90,
        quantidade: 10,
        tipoUnidade: 'paginas',
        usuarioAtual: {
          xpTotal: 50,
          nivelAtual: 1,
          ofensivaAtual: 2,
          ultimaLeituraData: '2026-05-24', // leu ontem
        },
      });

      expect(resultado.concluiuLivro).toBe(true);
      expect(resultado.novoProgressoPaginas).toBe(100);
      // 10 pág * 5 = 50 base + 5 bônus streak (10%) + 20 primeira do dia + 100 conclusão = 175 XP
      expect(resultado.detalhesXp.bonusConclusao).toBe(100);
      expect(resultado.xpGanho).toBe(175);
    });

    it('deve registrar sessão em minutos e calcular XP por tempo', async () => {
      const resultado = await registrarSessaoLeitura({
        usuarioId: 'user_1',
        itemEstanteId: 'item_1',
        livroId: 'book_1',
        livroTitulo: 'Clean Code',
        totalPaginasLivro: 400,
        progressoAtualLivro: 100,
        quantidade: 30, // 30 minutos
        tipoUnidade: 'minutos',
        paginasLidasAdicionais: 15, // leu 15 páginas nos 30 min
        usuarioAtual: {
          xpTotal: 200,
          nivelAtual: 2,
          ofensivaAtual: 1,
          ultimaLeituraData: null,
        },
      });

      // 30 min * 3 = 90 XP base + 20 bônus primeira leitura = 110 XP
      expect(resultado.detalhesXp.xpBase).toBe(90);
      expect(resultado.novoProgressoPaginas).toBe(115);
    });
  });

  describe('fetchUserSessions', () => {
    it('deve retornar lista vazia se usuarioId for vazio', async () => {
      const sessoes = await fetchUserSessions('');
      expect(sessoes).toEqual([]);
    });

    it('deve retornar sessões mapeadas do Firestore', async () => {
      (getDocs as jest.Mock).mockResolvedValueOnce({
        docs: [
          {
            id: 'sessao_1',
            data: () => ({
              usuarioId: 'user_1',
              itemEstanteId: 'item_1',
              livroId: 'b1',
              livroTitulo: '1984',
              quantidade: 25,
              tipoUnidade: 'paginas',
              xpGanho: 125,
              data: { toDate: () => new Date('2026-05-25T14:00:00Z') },
            }),
          },
        ],
      });

      const sessoes = await fetchUserSessions('user_1');
      expect(sessoes).toHaveLength(1);
      expect(sessoes[0].id).toBe('sessao_1');
      expect(sessoes[0].livroTitulo).toBe('1984');
      expect(sessoes[0].xpGanho).toBe(125);
    });
  });

  describe('sincronizarOfensivaUsuario', () => {
    it('deve zerar a ofensiva no Firestore se o streak tiver expirado', async () => {
      const usuario = {
        id: 'user_1',
        nome: 'Kaio',
        email: 'kaio@teste.com',
        xpTotal: 300,
        nivelAtual: 3,
        ofensivaAtual: 5,
        ultimaLeituraData: '2020-01-01', // Data bem no passado (expirada)
      };

      const streakAtualizado = await sincronizarOfensivaUsuario(usuario);
      expect(streakAtualizado).toBe(0);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ ofensivaAtual: 0 })
      );
    });
  });
});
