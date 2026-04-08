module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/unit/**/*.test.ts'],
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/$1',
    },
  }