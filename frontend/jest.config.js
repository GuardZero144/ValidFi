/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          module: 'esnext',
          moduleResolution: 'bundler',
          esModuleInterop: true,
          strict: true,
          target: 'ES2017',
          paths: { '@/*': ['./src/*'] },
        },
      },
    ],
  },
};
