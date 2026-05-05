module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    collectCoverageFrom: ['**/*.(t|j)s', '!**/*.module.ts', '!**/main.ts', '!**/index.ts'],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@modules/(.*)$': '<rootDir>/modules/$1',
        '^@common/(.*)$': '<rootDir>/common/$1',
        '^@prisma/service$': '<rootDir>/prisma/prisma.service',
    },
};
