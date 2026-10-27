import { excluirContaUsuario } from '../../src/services/accountService';
import { deleteDoc, getDocs } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockDeleteUser = jest.fn((_user?: any) => Promise.resolve());

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: {
      uid: 'user_delete_123',
      email: 'teste@mylib.com',
    },
  })),
  initializeAuth: jest.fn(() => ({
    currentUser: {
      uid: 'user_delete_123',
      email: 'teste@mylib.com',
    },
  })),
  getReactNativePersistence: jest.fn((storage) => storage),
  deleteUser: (user: any) => mockDeleteUser(user),
  EmailAuthProvider: {
    credential: jest.fn(),
  },
  reauthenticateWithCredential: jest.fn(() => Promise.resolve()),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ type: 'firestore' })),
  doc: jest.fn((...args) => ({ path: args.slice(1).join('/') })),
  collection: jest.fn((...args) => ({ path: args.slice(1).join('/') })),
  deleteDoc: jest.fn(() => Promise.resolve()),
  getDocs: jest.fn(() =>
    Promise.resolve({
      docs: [
        { ref: { path: 'doc_ref_1' } },
        { ref: { path: 'doc_ref_2' } },
      ],
    })
  ),
  setDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => 'TIMESTAMP_MOCK'),
}));

describe('accountService [Módulo 5 - Exclusão de Conta / LGPD]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve purgar subcoleções, remover do ranking e deletar conta do Firebase Auth', async () => {
    await excluirContaUsuario('user_delete_123');

    // Deve purgar documentos das subcoleções
    expect(getDocs).toHaveBeenCalled();
    expect(deleteDoc).toHaveBeenCalled();

    // Deve deletar o usuário no Firebase Auth
    expect(mockDeleteUser).toHaveBeenCalled();
  });

  it('deve rejeitar se o ID do usuário não bater com o usuário logado', async () => {
    await expect(excluirContaUsuario('outro_usuario_999')).rejects.toThrow(
      'Usuário não autenticado ou sessão inválida.'
    );
  });
});
