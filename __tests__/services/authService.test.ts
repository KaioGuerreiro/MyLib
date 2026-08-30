import { 
  getAuthErrorMessage, 
  signUpUser, 
  signInUser, 
  sendPasswordReset, 
  signOutUser,
  fetchUserProfile 
} from '../../src/services/authService';

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  updateProfile 
} from 'firebase/auth';
import { setDoc, getDoc } from 'firebase/firestore';

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
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendEmailVerification: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ type: 'firestore' })),
  doc: jest.fn((db, collection, id) => ({ collection, id })),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'TIMESTAMP_MOCK'),
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuthErrorMessage', () => {
    it('deve traduzir erros conhecidos do Firebase Auth', () => {
      expect(getAuthErrorMessage('auth/email-already-in-use')).toContain('cadastrado');
      expect(getAuthErrorMessage('auth/invalid-email')).toContain('inválido');
      expect(getAuthErrorMessage('auth/user-not-found')).toContain('E-mail ou senha incorretos');
      expect(getAuthErrorMessage('auth/wrong-password')).toContain('E-mail ou senha incorretos');
      expect(getAuthErrorMessage('auth/invalid-credential')).toContain('E-mail ou senha incorretos');
      expect(getAuthErrorMessage('auth/weak-password')).toContain('fraca');
      expect(getAuthErrorMessage('auth/too-many-requests')).toContain('Muitas tentativas');
      expect(getAuthErrorMessage('auth/network-request-failed')).toContain('conexão');
      expect(getAuthErrorMessage('auth/user-disabled')).toContain('desativada');
    });

    it('deve retornar mensagem generica para erros desconhecidos', () => {
      expect(getAuthErrorMessage('auth/unknown-code')).toContain('Ocorreu um erro');
    });
  });

  describe('signUpUser', () => {
    it('deve criar conta no Firebase Auth e documento no Firestore', async () => {
      const mockUser = { uid: 'user_123', email: 'test@example.com' };
      (createUserWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: mockUser });
      (updateProfile as jest.Mock).mockResolvedValueOnce(undefined);
      (setDoc as jest.Mock).mockResolvedValueOnce(undefined);

      const res = await signUpUser('Kaio Gomes', 'test@example.com', 'Senha@123');

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@example.com', 'Senha@123');
      expect(updateProfile).toHaveBeenCalledWith(mockUser, { displayName: 'Kaio Gomes' });
      expect(setDoc).toHaveBeenCalled();
      expect(res).toEqual({
        id: 'user_123',
        nome: 'Kaio Gomes',
        email: 'test@example.com',
        xpTotal: 0,
        nivelAtual: 1,
        ofensivaAtual: 0,
      });
    });

    it('deve rejeitar dados inválidos antes de chamar o Firebase', async () => {
      await expect(signUpUser('A', 'email-invalido', '123456')).rejects.toThrow('Nome inválido');
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();

      await expect(signUpUser('Kaio Gomes', 'test@example.com', '123456')).rejects.toThrow('Senha não atende');
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });
  });

  describe('signInUser', () => {
    it('deve autenticar usuario com email e senha', async () => {
      const mockUser = { uid: 'user_123', email: 'test@example.com' };
      (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: mockUser });

      const user = await signInUser('test@example.com', '123456');

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@example.com', '123456');
      expect(user).toBe(mockUser);
    });
  });

  describe('sendPasswordReset', () => {
    it('deve chamar sendPasswordResetEmail', async () => {
      (sendPasswordResetEmail as jest.Mock).mockResolvedValueOnce(undefined);

      await sendPasswordReset('test@example.com');

      expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'test@example.com');
    });
  });

  describe('signOutUser', () => {
    it('deve chamar signOut', async () => {
      (signOut as jest.Mock).mockResolvedValueOnce(undefined);

      await signOutUser();

      expect(signOut).toHaveBeenCalledWith(expect.anything());
    });
  });

  describe('fetchUserProfile', () => {
    it('deve retornar perfil do usuario quando existir no Firestore', async () => {
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          nome: 'Kaio Gomes',
          email: 'test@example.com',
          xpTotal: 100,
          nivelAtual: 2,
          ofensivaAtual: 5,
        }),
      });

      const profile = await fetchUserProfile('user_123');

      expect(profile).toEqual({
        id: 'user_123',
        nome: 'Kaio Gomes',
        email: 'test@example.com',
        xpTotal: 100,
        nivelAtual: 2,
        ofensivaAtual: 5,
      });
    });

    it('deve retornar null se documento nao existir', async () => {
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => false,
      });

      const profile = await fetchUserProfile('user_999');

      expect(profile).toBeNull();
    });
  });

  describe('sendVerificationEmail e checkEmailVerified', () => {
    it('deve chamar sendEmailVerification com o usuario', async () => {
      const mockUser: any = { uid: 'user_123' };
      const { sendVerificationEmail } = require('../../src/services/authService');
      const { sendEmailVerification } = require('firebase/auth');

      await sendVerificationEmail(mockUser);
      expect(sendEmailVerification).toHaveBeenCalledWith(mockUser);
    });

    it('deve recarregar o usuario e retornar emailVerified', async () => {
      const mockUser: any = { 
        uid: 'user_123', 
        emailVerified: true, 
        reload: jest.fn().mockResolvedValue(undefined) 
      };
      const { checkEmailVerified } = require('../../src/services/authService');

      const isVerified = await checkEmailVerified(mockUser);
      expect(mockUser.reload).toHaveBeenCalled();
      expect(isVerified).toBe(true);
    });
  });
});
