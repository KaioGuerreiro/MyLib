import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from '../../src/screens/HomeScreen';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { AuthProvider } from '../../src/context/AuthContext';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
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
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback({ uid: 'user_123', displayName: 'Kaio Guerreiro', email: 'kaio@example.com' });
    return jest.fn();
  }),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ type: 'firestore' })),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  collection: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
}));

let mockBookshelf: any[] = [];

jest.mock('../../src/services/bookshelfService', () => {
  const original = jest.requireActual('../../src/services/bookshelfService');
  return {
    ...original,
    subscribeToUserBookshelf: jest.fn((uid, onUpdate) => {
      onUpdate(mockBookshelf);
      return jest.fn();
    }),
  };
});

import { NavigationContainer } from '@react-navigation/native';

describe('HomeScreen', () => {
  beforeEach(() => {
    mockBookshelf = [];
  });

  it('deve renderizar o nome do usuário e o controle de logout', async () => {
    const initialMetrics = {
      frame: { x: 0, y: 0, width: 320, height: 640 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    };

    const { getByLabelText, getByText } = render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ThemeProvider>
          <AuthProvider>
            <NavigationContainer>
              <HomeScreen />
            </NavigationContainer>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(getByText('Kaio Guerreiro')).toBeTruthy();
      expect(getByText(/Olá, Kaio/)).toBeTruthy();
      expect(getByLabelText('Opções de perfil e logout')).toBeTruthy();
    });
  });

  it('deve exibir os cards de gamificação: ofensiva, nível e progresso de XP', async () => {
    const initialMetrics = {
      frame: { x: 0, y: 0, width: 320, height: 640 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    };

    const { getByText } = render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ThemeProvider>
          <AuthProvider>
            <NavigationContainer>
              <HomeScreen />
            </NavigationContainer>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(getByText('Ofensiva')).toBeTruthy();
      expect(getByText('Nível 1')).toBeTruthy();
      expect(getByText('Rumo ao Nível 2')).toBeTruthy();
    });
  });

  it('deve exibir o card de leitura atual com estilo e informações corretas quando houver livro em leitura', async () => {
    mockBookshelf = [
      {
        id: 'item_1',
        usuarioId: 'user_123',
        livroId: 'book_1',
        status: 'LENDO',
        progressoPaginas: 45,
        dataAdicao: new Date(),
        livro: {
          idGoogleBooks: 'book_1',
          titulo: 'O Pequeno Príncipe',
          autor: 'Antoine de Saint-Exupéry',
          totalPaginas: 90,
          urlCapa: 'https://example.com/capa.jpg',
        },
      },
    ];

    const initialMetrics = {
      frame: { x: 0, y: 0, width: 320, height: 640 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    };

    const { getByText, getAllByText, getByLabelText } = render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ThemeProvider>
          <AuthProvider>
            <NavigationContainer>
              <HomeScreen />
            </NavigationContainer>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(getByText('LENDO AGORA')).toBeTruthy();
      expect(getAllByText('O Pequeno Príncipe').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('Antoine de Saint-Exupéry').length).toBeGreaterThanOrEqual(1);
      expect(getByText('50% Concluído')).toBeTruthy();
      expect(getByText('45 de 90 pág.')).toBeTruthy();
      expect(getByLabelText('Continuar leitura')).toBeTruthy();
    });
  });
});
