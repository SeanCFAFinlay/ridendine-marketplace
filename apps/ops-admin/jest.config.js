const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@ridendine/db$': '<rootDir>/../../packages/db/src/index.ts',
    '^@ridendine/engine$': '<rootDir>/../../packages/engine/src/index.ts',
    '^@ridendine/engine/server$': '<rootDir>/../../packages/engine/src/server.ts',
    '^@ridendine/types$': '<rootDir>/../../packages/types/src/index.ts',
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
};

module.exports = createJestConfig(customJestConfig);
