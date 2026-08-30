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

describe('HomeScreen', () => {
  it('deve renderizar o nome do usuário e o controle de logout', async () => {
    const initialMetrics = {
      frame: { x: 0, y: 0, width: 320, height: 640 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    };

    const { getByLabelText, getByText } = render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ThemeProvider>
          <AuthProvider>
            <HomeScreen />
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
});
