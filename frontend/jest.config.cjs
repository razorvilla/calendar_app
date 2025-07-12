/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: '.',
  setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'],
  moduleNameMapper: {
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
  },
  testMatch: ['<rootDir>/src/**/*.test.(ts|tsx)'],
};
