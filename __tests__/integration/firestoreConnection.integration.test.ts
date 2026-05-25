/**
 * TESTE DE INTEGRAÇÃO — Firebase Firestore
 *
 * Testa a conexão REAL com o Firebase (grava, lê e apaga um documento).
 * REQUISITO: O arquivo .env deve estar preenchido com as credenciais reais.
 *
 * Execute com: npm run test:integration
 */
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

// Verifica as credenciais antes de inicializar
const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

const credenciaisConfiguradas = Boolean(apiKey && projectId);

// Pula os testes reais se as credenciais não estiverem configuradas
const descrever = credenciaisConfiguradas ? describe : describe.skip;

descrever('[INTEGRAÇÃO] Firestore — Conexão Real com o Banco', () => {
  let db: ReturnType<typeof getFirestore>;

  beforeAll(() => {
    const firebaseConfig = {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
  });

  afterAll(async () => {
    const ref = doc(db, '_test_connection', 'teste_automatizado');
    await deleteDoc(ref).catch(() => {});
  });

  it('deve gravar um documento no Firestore com sucesso', async () => {
    const ref = doc(db, '_test_connection', 'teste_automatizado');
    const payload = {
      mensagem: 'Teste de conexão MyLib',
      timestamp: new Date().toISOString(),
      sucesso: true,
    };
    await expect(setDoc(ref, payload)).resolves.toBeUndefined();
  });

  it('deve ler o documento gravado e validar os dados', async () => {
    const ref = doc(db, '_test_connection', 'teste_automatizado');
    const snapshot = await getDoc(ref);

    expect(snapshot.exists()).toBe(true);
    const dados = snapshot.data();
    expect(dados?.mensagem).toBe('Teste de conexão MyLib');
    expect(dados?.sucesso).toBe(true);
    expect(dados?.timestamp).toBeDefined();
  });

  it('deve deletar o documento de teste com sucesso', async () => {
    const ref = doc(db, '_test_connection', 'teste_automatizado');
    await expect(deleteDoc(ref)).resolves.toBeUndefined();

    const snapshot = await getDoc(ref);
    expect(snapshot.exists()).toBe(false);
  });
});

if (!credenciaisConfiguradas) {
  test('⚠️  Preencha o .env com as credenciais do Firebase para rodar os testes de integração reais.', () => {
    console.warn('\nVariáveis de ambiente não configuradas. Preencha o .env e rode novamente.');
    expect(true).toBe(true);
  });
}
