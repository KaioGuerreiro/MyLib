import {
  collection,
  doc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import {
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { removerUsuarioDoRanking } from './rankingService';

/**
 * Exclui todos os documentos de uma subcoleção do usuário no Firestore.
 */
async function purgarSubcolecao(usuarioId: string, subcolecao: string): Promise<void> {
  try {
    const colRef = collection(db, 'usuarios', usuarioId, subcolecao);
    const snap = await getDocs(colRef);
    const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn(`Erro ao purgar subcoleção ${subcolecao}:`, err);
  }
}

/**
 * [Módulo 5 - Direito ao Esquecimento / LGPD]
 * Exclui permanentemente todos os dados do usuário do Cloud Firestore e do Firebase Auth.
 * 
 * 1. Reautentica se a senha for informada (evita auth/requires-recent-login).
 * 2. Purga subcoleções (/sessoes, /estante, /metas, /conquistas).
 * 3. Remove o registro público de /ranking/{usuarioId}.
 * 4. Exclui o documento raiz /usuarios/{usuarioId}.
 * 5. Exclui a conta no Firebase Auth.
 */
export async function excluirContaUsuario(
  usuarioId: string,
  senhaConfirmacao?: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== usuarioId) {
    throw new Error('Usuário não autenticado ou sessão inválida.');
  }

  // 1. Reautenticação se a senha for fornecida
  if (senhaConfirmacao && currentUser.email) {
    const credential = EmailAuthProvider.credential(currentUser.email, senhaConfirmacao);
    await reauthenticateWithCredential(currentUser, credential);
  }

  // 2. Limpeza em cascata de todas as subcoleções no Firestore
  await Promise.all([
    purgarSubcolecao(usuarioId, 'sessoes'),
    purgarSubcolecao(usuarioId, 'estante'),
    purgarSubcolecao(usuarioId, 'metas'),
    purgarSubcolecao(usuarioId, 'conquistas'),
  ]);

  // 3. Remove do ranking público
  await removerUsuarioDoRanking(usuarioId);

  // 4. Remove documento principal do usuário
  try {
    const usuarioDocRef = doc(db, 'usuarios', usuarioId);
    await deleteDoc(usuarioDocRef);
  } catch (err) {
    console.warn('Erro ao excluir documento do usuário no Firestore:', err);
  }

  // 5. Exclui o usuário no Firebase Auth
  await deleteUser(currentUser);
}
