# 📖 MyLib — Leitura Gamificada

> Aplicativo móvel para incentivo, gestão e gamificação do hábito diário de leitura.

![Expo 57](https://img.shields.io/badge/Expo-57-blue.svg)
![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg)
![Firebase](https://img.shields.io/badge/Firebase-v12-FFCA28.svg)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-NativeWind%20v4-38B2AC.svg)
![Jest CI](https://img.shields.io/badge/Tests-15%20passed-brightgreen.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## 🎓 Contexto Acadêmico

- **Instituição:** UNIGRAN — Centro Universitário da Grande Dourados
- **Curso:** Bacharelado em Engenharia de Software
- **Trabalho:** Trabalho de Conclusão de Curso (TCC II)
- **Autor:** Kaio Rodrigo Guerreiro Gomes
- **Orientador:** Prof. M.Sc. Ezéfferth Chlysman Araujo Fernandes

---

## ✨ Principais Funcionalidades

- **🔥 Gamificação Completa do Hábito:**
  - **Ofensivas (Streaks):** Contabilização de dias consecutivos de leitura com sincronização automática e proteção contra inatividade.
  - **Experiência (XP):** Ganho de pontos com base em páginas lidas ou tempo de leitura dedicado.
  - **Níveis e Títulos:** Progressão de níveis (*Iniciado*, *Devorador de Páginas*, *Arquivista*, etc.) com barra de progresso visual.
- **📚 Integração com Google Books API:**
  - Busca inteligente com debouncing, categorização por gênero literário e visualização de capas em alta resolução.
  - Controle de taxa e concorrência via `rateLimiter` nativo.
- **📑 Gestão Completa da Estante:**
  - Organização por abas: `LENDO`, `LIDOS` e `NA FILA`.
  - Contadores em tempo real e atualização dinâmica com Firestore listeners.
- **⏱️ Registro de Sessões de Leitura:**
  - Modal interativo para registro de progresso por páginas ou minutos cronometrados.
  - Promoção automática do livro para `LIDO` ao atingir a última página.
- **🎨 Design Apple Human Interface Guidelines (HIG):**
  - Barra de abas flutuante translúcida com suporte a **Liquid Glass** nativo no iOS (`expo-glass-effect`).
  - Suporte completo e dinâmico a **Modo Claro (Light)** e **Modo Escuro (Dark)** com transições suaves e feedback tátil (`expo-haptics`).
- **🔒 Segurança e Persistência:**
  - Autenticação via Firebase Auth (cadastro, login, recuperação de senha e verificação de e-mail).
  - Regras de segurança granulares no Firestore (`firestore.rules`) isolando subcoleções por usuário.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Mobile Framework** | React Native 0.86 com Expo 57 (SDK v57) |
| **Linguagem** | TypeScript (~6.0) |
| **Estilização** | NativeWind v4 + Tailwind CSS 3.4 |
| **Efeitos Visuais** | `expo-glass-effect`, `expo-linear-gradient`, `expo-haptics` |
| **Navegação** | React Navigation 7.x (`@react-navigation/bottom-tabs`, `@react-navigation/native-stack`) |
| **BaaS / Backend** | Firebase (Auth + Cloud Firestore NoSQL) |
| **Armazenamento Local** | `@react-native-async-storage/async-storage` |
| **API Externa** | Google Books API (REST via `fetch` nativo) |
| **Testes Automatizados** | Jest 29 (`jest-expo`), React Native Testing Library |
| **Qualidade de Código** | ESLint 9 (`eslint-config-expo`), TypeScript Typecheck (`tsc --noEmit`) |

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
- Aplicativo [Expo Go](https://expo.dev/go) instalado no celular físico ou emulador Android/iOS (Android Studio / Xcode).

### 1. Clonar o repositório
```bash
git clone https://github.com/KaioGuerreiro/MyLib.git
cd MyLib
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Configurar as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=sua_api_key_aqui
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=seu_app_id
EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY=sua_chave_opcional
```

### 4. Iniciar a aplicação
```bash
# Inicia o servidor Metro do Expo
npm start

# Ou execute diretamente no emulador Android / iOS
npm run android
npm run ios
```

---

## 🧪 Testes e Qualidade

O projeto conta com suíte automatizada de testes cobrindo autenticação, serviços de leitura, estante, modelos de dados e telas:

```bash
# Executa a suíte de Integração Contínua (Lint + Typecheck + Testes Jest)
npm run test:ci

# Executa apenas os testes unitários via Jest
npm test

# Executa verificação estática de tipos
npm run typecheck

# Executa o linter do código
npm run lint
```

---

## 📁 Estrutura de Pastas

```
MyLib/
├── src/
│   ├── components/         # Componentes reutilizáveis (ReadingSessionModal, ThemeSlider, etc.)
│   ├── config/             # Configuração do Firebase e SDKs
│   ├── context/            # Contextos React (AuthContext)
│   ├── models/             # Interfaces e tipos de domínio (Usuario, Livro, ItemEstante, etc.)
│   ├── navigation/         # Navegação (RootNavigator, AuthNavigator, TabNavigator Liquid Glass)
│   ├── screens/            # Telas do app (HomeScreen, SearchScreen, LibraryScreen, etc.)
│   ├── services/           # Regras de negócio e APIs (googleBooksService, bookshelfService, etc.)
│   ├── theme/              # Tokens de cor, ThemeContext e sistema de temas Dark/Light
│   └── utils/              # Funções auxiliares (gamificação, rate limiter, validação)
├── __tests__/              # Suíte de testes unitários e de integração com Jest
├── firestore.rules         # Regras de segurança do Cloud Firestore
├── tailwind.config.js      # Configuração do Tailwind CSS / NativeWind
├── GEMINI.md               # Contexto detalhado do TCC e documentação para IAs
└── README.md               # Documentação principal do repositório
```

---

## 📄 Licença

Este projeto está licenciado sob a licença [MIT](LICENSE).
