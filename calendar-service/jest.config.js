module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['./tests/setup.js'],
    coveragePathIgnorePatterns: [
        '/node_modules/'
    ]
};