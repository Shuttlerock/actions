module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  preset: 'ts-jest',
  roots: ["."],
  moduleNameMapper: {
    "^@sr-actions/(.+)$": "<rootDir>/src/actions/$1",
    "^@sr-services/(.+)$": "<rootDir>/src/services/$1",
    "^@sr-tests/(.+)$": "<rootDir>/src/tests/$1",
    "^@sr-triggers/(.+)$": "<rootDir>/src/triggers/$1",
  },
  setupFiles: ['./src/tests/Setup.ts'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testRunner: 'jest-circus/runner',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  verbose: true
}
