import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AchievementsScreen from '../../src/screens/AchievementsScreen';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { AuthProvider } from '../../src/context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification_id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
  },
  AndroidImportance: {
    HIGH: 4,
  },
}));

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
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => 'TIMESTAMP_MOCK'),
}));

jest.mock('../../src/services/bookshelfService', () => {
  const original = jest.requireActual('../../src/services/bookshelfService');
  return {
    ...original,
    subscribeToUserBookshelf: jest.fn((uid, onUpdate) => {
      onUpdate([]);
      return jest.fn();
    }),
  };
});

describe('AchievementsScreen [RF007, RF008, RF010]', () => {
  const initialMetrics = {
    frame: { x: 0, y: 0, width: 375, height: 812 },
    insets: { top: 44, left: 0, right: 0, bottom: 34 },
  };

  const renderComponent = () =>
    render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ThemeProvider>
          <AuthProvider>
            <NavigationContainer>
              <AchievementsScreen />
            </NavigationContainer>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );

  it('deve renderizar o título da tela e seções principais', async () => {
    const { getByText } = renderComponent();

    await waitFor(() => {
      expect(getByText('Conquistas & Metas')).toBeTruthy();
      expect(getByText('Minhas Metas')).toBeTruthy();
      expect(getByText('Lembrete de Leitura Diário')).toBeTruthy();
      expect(getByText('Mural de Conquistas')).toBeTruthy();
    });
  });

  it('deve exibir os filtros de categoria e a barra de recompensas', async () => {
    const { getByText } = renderComponent();

    await waitFor(() => {
      expect(getByText('SISTEMA DE RECOMPENSAS')).toBeTruthy();
      expect(getByText('Todas')).toBeTruthy();
      expect(getByText('Ofensiva')).toBeTruthy();
      expect(getByText('Livros')).toBeTruthy();
      expect(getByText('Páginas')).toBeTruthy();
      expect(getByText('Geral')).toBeTruthy();
    });
  });

  it('deve exibir os cards para configuração de metas diária e mensal com botões concisos', async () => {
    const { getByText, getAllByText } = renderComponent();

    await waitFor(() => {
      expect(getByText('Meta Diária')).toBeTruthy();
      expect(getByText('Meta Mensal')).toBeTruthy();
      expect(getAllByText('Definir Meta').length).toBe(2);
    });
  });
});
