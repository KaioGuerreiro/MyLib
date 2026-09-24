import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LibraryScreen from '../../src/screens/LibraryScreen';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { AuthProvider } from '../../src/context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';

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
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback({ uid: 'user_123', displayName: 'Kaio Guerreiro', email: 'kaio@example.com' });
    return jest.fn();
  }),
}));

jest.mock('../../src/services/bookshelfService', () => {
  const original = jest.requireActual('../../src/services/bookshelfService');
  return {
    ...original,
    subscribeToUserBookshelf: jest.fn((uid, onUpdate) => {
      onUpdate([
        {
          id: 'item_1',
          usuarioId: 'user_123',
          livroId: 'book_1',
          status: 'LENDO',
          progressoPaginas: 45,
          dataAdicao: new Date(),
          livro: {
            idGoogleBooks: 'book_1',
            titulo: 'Memórias Póstumas de Brás Cubas',
            autor: 'Machado de Assis',
            totalPaginas: 180,
            urlCapa: '',
          },
        },
      ]);
      return jest.fn();
    }),
  };
});

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ type: 'firestore' })),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  collection: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
}));

describe('LibraryScreen', () => {
  it('deve renderizar a tela de biblioteca com filtros e livro carregado', async () => {
    const initialMetrics = {
      frame: { x: 0, y: 0, width: 320, height: 640 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    };

    const { getByText, getAllByText } = render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ThemeProvider>
          <AuthProvider>
            <NavigationContainer>
              <LibraryScreen />
            </NavigationContainer>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(getByText('Minha Biblioteca')).toBeTruthy();
      expect(getByText('Memórias Póstumas de Brás Cubas')).toBeTruthy();
      expect(getByText('Machado de Assis')).toBeTruthy();
      expect(getByText('Todos')).toBeTruthy();
      expect(getAllByText(/Lendo/i).length).toBeGreaterThan(0);
    });
  });
});
