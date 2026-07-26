import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification,
  signOut, 
  updateProfile,
  User 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Usuario } from '../models/Usuario';

/**
 * Traduz códigos de erro do Firebase Auth para mensagens amigáveis em português.
 */
export function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado em outra conta.';
    case 'auth/invalid-email':
      return 'O e-mail informado é inválido.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.';
    case 'auth/weak-password':
      return 'A senha é muito fraca. Escolha uma senha com no mínimo 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas malsucedidas. Por favor, tente novamente mais tarde.';
    case 'auth/network-request-failed':
      return 'Falha na conexão de rede. Verifique sua internet.';
    case 'auth/user-disabled':
      return 'Esta conta de usuário foi desativada.';
    default:
      return 'Ocorreu um erro na autenticação. Tente novamente.';
  }
}

/**
 * Cadastra um novo usuário no Firebase Auth e cria o perfil no Cloud Firestore.
 */
export async function signUpUser(nome: string, email: string, senha: string): Promise<Usuario> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
  const user = userCredential.user;

  // Atualiza o nome de exibição no perfil Auth
  await updateProfile(user, { displayName: nome });

  const novoUsuario: Usuario = {
    id: user.uid,
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    xpTotal: 0,
    nivelAtual: 1,
    ofensivaAtual: 0,
  };

  // Envia e-mail de verificação via Firebase Auth
  try {
    await sendEmailVerification(user);
  } catch (err: any) {
    console.warn('Não foi possível enviar e-mail de verificação no cadastro:', err?.message || err);
  }

  // Persiste no Cloud Firestore na coleção 'usuarios'
  try {
    await setDoc(doc(db, 'usuarios', user.uid), {
      ...novoUsuario,
      createdAt: serverTimestamp(),
    });
  } catch (err: any) {
    console.warn('Não foi possível criar perfil no Firestore (verifique as regras de segurança do Cloud Firestore):', err?.message || err);
  }

  return novoUsuario;
}

/**
 * Realiza o login de um usuário cadastrado via e-mail e senha.
 */
export async function signInUser(email: string, senha: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, senha);
  return userCredential.user;
}

/**
 * Envia um e-mail de redefinição de senha para o endereço informado.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Desconecta o usuário atualmente autenticado.
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Busca os dados do perfil do usuário no Firestore.
 */
export async function fetchUserProfile(uid: string): Promise<Usuario | null> {
  try {
    const userDoc = await getDoc(doc(db, 'usuarios', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        id: uid,
        nome: data.nome || '',
        email: data.email || '',
        xpTotal: data.xpTotal || 0,
        nivelAtual: data.nivelAtual || 1,
        ofensivaAtual: data.ofensivaAtual || 0,
      };
    }
  } catch (err: any) {
    console.warn('Não foi possível buscar perfil no Firestore (verifique as regras de segurança):', err?.message || err);
  }
  return null;
}

/**
 * Envia o e-mail de verificação de conta para o usuário logado.
 */
export async function sendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user);
}

/**
 * Recarrega o estado do usuário no Firebase Auth e checa se o e-mail foi verificado.
 */
export async function checkEmailVerified(user: User): Promise<boolean> {
  await user.reload();
  return user.emailVerified;
}
