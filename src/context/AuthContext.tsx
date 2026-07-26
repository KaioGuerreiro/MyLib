import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Usuario } from '../models/Usuario';
import { 
  signInUser, 
  signUpUser, 
  sendPasswordReset, 
  signOutUser, 
  fetchUserProfile 
} from '../services/authService';

interface AuthContextData {
  user: User | null;
  userData: Usuario | null;
  initializing: boolean;
  signIn: (email: string, senha: string) => Promise<User>;
  signUp: (nome: string, email: string, senha: string) => Promise<Usuario>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<Usuario | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  const loadUserData = async (currentUser: User) => {
    try {
      const profile = await fetchUserProfile(currentUser.uid);
      if (profile) {
        setUserData(profile);
      } else {
        // Perfil fallback baseado no usuário Firebase Auth
        setUserData({
          id: currentUser.uid,
          nome: currentUser.displayName || currentUser.email?.split('@')[0] || 'Leitor',
          email: currentUser.email || '',
          xpTotal: 0,
          nivelAtual: 1,
          ofensivaAtual: 0,
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do usuário:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadUserData(currentUser);
      } else {
        setUserData(null);
      }
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, senha: string): Promise<User> => {
    const loggedUser = await signInUser(email, senha);
    setUser(loggedUser);
    await loadUserData(loggedUser);
    return loggedUser;
  };

  const signUp = async (nome: string, email: string, senha: string): Promise<Usuario> => {
    const novoUsuario = await signUpUser(nome, email, senha);
    setUserData(novoUsuario);
    return novoUsuario;
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordReset(email);
  };

  const signOut = async (): Promise<void> => {
    await signOutUser();
    setUser(null);
    setUserData(null);
  };

  const refreshUserProfile = async (): Promise<void> => {
    if (user) {
      await loadUserData(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        initializing,
        signIn,
        signUp,
        resetPassword,
        signOut,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
