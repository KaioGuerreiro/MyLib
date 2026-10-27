import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ProfileScreen from '../../src/screens/ProfileScreen';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { NavigationContainer } from '@react-navigation/native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Warning: 'warning' },
}));

const mockUpdateName = jest.fn(() => Promise.resolve('Novo Nome'));
const mockUpdateAvatar = jest.fn(() => Promise.resolve());
const mockSignOut = jest.fn(() => Promise.resolve());
const mockDeleteAccount = jest.fn(() => Promise.resolve());

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user_profile_123', displayName: 'Kaio Leitor', email: 'kaio@mylib.com' },
    userData: {
      id: 'user_profile_123',
      nome: 'Kaio Leitor',
      email: 'kaio@mylib.com',
      xpTotal: 650,
      nivelAtual: 4,
      ofensivaAtual: 12,
      avatarId: 'owl',
    },
    signOut: mockSignOut,
    updateName: mockUpdateName,
    updateAvatar: mockUpdateAvatar,
    deleteAccount: mockDeleteAccount,
  }),
}));

jest.mock('../../src/services/statsService', () => ({
  fetchUserStats: jest.fn(() =>
    Promise.resolve({
      totalPaginasLidas: 320,
      totalMinutosLidos: 180,
      totalLivrosConcluidos: 3,
      totalLivrosLendo: 1,
      totalSessoes: 15,
      diasLidosNaSemana: 5,
      mediaPaginasPorDiaSemana: 45,
      diaMaisProdutivo: 'Sáb (60 pág)',
      leituraSemanal: [
        { diaSemana: 'Dom', data: '2026-10-18', paginas: 20, minutos: 15, xp: 100 },
        { diaSemana: 'Seg', data: '2026-10-19', paginas: 30, minutos: 20, xp: 150 },
        { diaSemana: 'Ter', data: '2026-10-20', paginas: 40, minutos: 25, xp: 200 },
        { diaSemana: 'Qua', data: '2026-10-21', paginas: 0, minutos: 0, xp: 0 },
        { diaSemana: 'Qui', data: '2026-10-22', paginas: 50, minutos: 30, xp: 250 },
        { diaSemana: 'Sex', data: '2026-10-23', paginas: 35, minutos: 20, xp: 175 },
        { diaSemana: 'Sáb', data: '2026-10-24', paginas: 60, minutos: 40, xp: 300 },
      ],
    })
  ),
}));

jest.mock('../../src/services/rankingService', () => ({
  fetchRanking: jest.fn(() =>
    Promise.resolve([
      {
        id: 'u1',
        nome: 'Mestre Yoda',
        xpTotal: 2500,
        nivelAtual: 9,
        ofensivaAtual: 45,
        avatarId: 'wizard',
        posicao: 1,
      },
      {
        id: 'user_profile_123',
        nome: 'Kaio Leitor',
        xpTotal: 650,
        nivelAtual: 4,
        ofensivaAtual: 12,
        avatarId: 'owl',
        posicao: 2,
      },
      {
        id: 'u3',
        nome: 'Hermione Granger',
        xpTotal: 500,
        nivelAtual: 3,
        ofensivaAtual: 10,
        avatarId: 'coffee',
        posicao: 3,
      },
    ])
  ),
  sincronizarRankingUsuario: jest.fn(() => Promise.resolve()),
}));

describe('ProfileScreen [Módulo 5]', () => {
  const initialMetrics = {
    frame: { x: 0, y: 0, width: 375, height: 812 },
    insets: { top: 44, left: 0, right: 0, bottom: 34 },
  };

  const renderScreen = () =>
    render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ThemeProvider>
          <NavigationContainer>
            <ProfileScreen />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    );

  it('deve renderizar o perfil do leitor com métricas e abas', async () => {
    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Kaio Leitor')).toBeTruthy();
      expect(getByText('Relatórios')).toBeTruthy();
      expect(getByText('Ranking')).toBeTruthy();
      expect(getByText('Ajustes')).toBeTruthy();
    });
  });

  it('deve alternar entre as abas e exibir configurações e ranking', async () => {
    const { getByText, getAllByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Relatórios')).toBeTruthy();
    });

    // Clica na aba Ranking
    fireEvent.press(getByText('Ranking'));
    await waitFor(() => {
      expect(getAllByText('Mestre Yoda').length).toBeGreaterThan(0);
      expect(getAllByText('Hermione Granger').length).toBeGreaterThan(0);
    });

    // Clica na aba Ajustes
    fireEvent.press(getByText('Ajustes'));
    await waitFor(() => {
      expect(getByText('Aparência')).toBeTruthy();
      expect(getByText('Gestão da Conta')).toBeTruthy();
      expect(getByText('Sair da Conta')).toBeTruthy();
      expect(getByText(/Excluir Minha Conta/)).toBeTruthy();
    });
  });
});
