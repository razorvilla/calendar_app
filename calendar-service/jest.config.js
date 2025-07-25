module.exports = {
    setupFilesAfterEnv: ['./tests/setup.js'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/tests/integration/setup.js' // Exclude setup file from test execution
    ]
};