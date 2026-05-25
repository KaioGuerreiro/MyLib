module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/integration/**/*.test.ts'],
  testTimeout: 15000,
  // Carrega o .env antes dos testes
  globalSetup: './jest.integration.setup.js',
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(firebase|@firebase|expo|expo-modules-core)/)',
  ],
};
