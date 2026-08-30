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
}));

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import app, { auth, db } from '../../src/config/firebase';

const mockInitializeApp = initializeApp as jest.Mock;
const mockGetApps = getApps as jest.Mock;
const mockInitializeAuth = initializeAuth as jest.Mock;
const mockGetFirestore = getFirestore as jest.Mock;

describe('Firebase Connection', () => {
  it('deve exportar app, auth e db definidos', () => {
    expect(app).toBeDefined();
    expect(auth).toBeDefined();
    expect(db).toBeDefined();
  });

  it('deve inicializar o app com todas as chaves de configuração', () => {
    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
    const configPassado = mockInitializeApp.mock.calls[0][0];
    expect(configPassado).toHaveProperty('apiKey');
    expect(configPassado).toHaveProperty('authDomain');
    expect(configPassado).toHaveProperty('projectId');
    expect(configPassado).toHaveProperty('storageBucket');
    expect(configPassado).toHaveProperty('messagingSenderId');
    expect(configPassado).toHaveProperty('appId');
  });

  it('deve criar Auth com persistencia AsyncStorage e Firestore usando o app inicializado', () => {
    const appCriado = mockInitializeApp.mock.results[0].value;
    expect(mockInitializeAuth).toHaveBeenCalledWith(appCriado, expect.objectContaining({ persistence: expect.anything() }));
    expect(mockGetFirestore).toHaveBeenCalledWith(appCriado);
  });

  it('deve verificar se já existe um app antes de inicializar (singleton)', () => {
    expect(mockGetApps).toHaveBeenCalled();
  });
});
