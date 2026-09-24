import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ReadingSessionModal from '../../src/components/ReadingSessionModal';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import * as readingSessionService from '../../src/services/readingSessionService';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

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
  doc: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  getDocs: jest.fn(),
  serverTimestamp: jest.fn(() => 'TIMESTAMP_MOCK'),
}));

describe('ReadingSessionModal', () => {
  const mockBook = {
    id: 'item_1',
    usuarioId: 'user_1',
    livroId: 'book_1',
    status: 'LENDO' as const,
    progressoPaginas: 40,
    dataAdicao: new Date(),
    livro: {
      idGoogleBooks: 'book_1',
      titulo: 'Dom Casmurro',
      autor: 'Machado de Assis',
      totalPaginas: 200,
      urlCapa: '',
    },
  };

  const mockUser = {
    id: 'user_1',
    nome: 'Kaio Guerreiro',
    email: 'kaio@teste.com',
    xpTotal: 100,
    nivelAtual: 2,
    ofensivaAtual: 3,
    ultimaLeituraData: '2026-05-24',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('não deve renderizar nada quando visible for false', () => {
    const { queryByText } = render(
      <ThemeProvider>
        <ReadingSessionModal
          visible={false}
          book={mockBook}
          user={mockUser}
          onClose={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(queryByText('Registrar Sessão')).toBeNull();
  });

  it('deve renderizar o título do livro e progresso atual quando visível', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ReadingSessionModal
          visible={true}
          book={mockBook}
          user={mockUser}
          onClose={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(getByText('Registrar Sessão')).toBeTruthy();
    expect(getByText('Dom Casmurro')).toBeTruthy();
    expect(getByText('40 de 200 páginas')).toBeTruthy();
    expect(getByText('Páginas Lidas')).toBeTruthy();
    expect(getByText('Cronômetro')).toBeTruthy();
  });

  it('deve alternar entre os modos Páginas Lidas e Cronômetro', () => {
    const { getByText, queryByText } = render(
      <ThemeProvider>
        <ReadingSessionModal
          visible={true}
          book={mockBook}
          user={mockUser}
          onClose={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(getByText('Quantas páginas você leu?')).toBeTruthy();

    fireEvent.press(getByText('Cronômetro'));

    expect(queryByText('Quantas páginas você leu?')).toBeNull();
    expect(getByText('Iniciar')).toBeTruthy();
  });

  it('deve registrar a sessão de leitura com sucesso e mostrar tela de celebração', async () => {
    const registrarSpy = jest
      .spyOn(readingSessionService, 'registrarSessaoLeitura')
      .mockResolvedValueOnce({
        sessaoId: 'sess_1',
        xpGanho: 75,
        detalhesXp: {
          xpBase: 50,
          bonusStreak: 5,
          bonusDiario: 20,
          bonusConclusao: 0,
          xpTotal: 75,
        },
        novoXpTotal: 175,
        nivelAnterior: 2,
        novoNivel: 2,
        subiuDeNivel: false,
        ofensivaAnterior: 3,
        novaOfensiva: 4,
        streakIncrementado: true,
        streakResetado: false,
        concluiuLivro: false,
        novoProgressoPaginas: 50,
      });

    const onCompleteMock = jest.fn();

    const { getByText, getByPlaceholderText } = render(
      <ThemeProvider>
        <ReadingSessionModal
          visible={true}
          book={mockBook}
          user={mockUser}
          onClose={jest.fn()}
          onSessionComplete={onCompleteMock}
        />
      </ThemeProvider>
    );

    const input = getByPlaceholderText('0');
    fireEvent.changeText(input, '10');

    const btnSalvar = getByText('Salvar Sessão de Leitura');
    fireEvent.press(btnSalvar);

    await waitFor(() => {
      expect(registrarSpy).toHaveBeenCalledTimes(1);
      expect(getByText('Sessão Concluída! 🎉')).toBeTruthy();
      expect(getByText('+75 XP')).toBeTruthy();
      expect(getByText('4 dias 🔥')).toBeTruthy();
      expect(onCompleteMock).toHaveBeenCalledTimes(1);
    });
  });
});
