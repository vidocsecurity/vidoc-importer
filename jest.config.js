export default {
    testEnvironment: 'node',
    // transform: {
    //   "^.+\\.tsx?$": "ts-jest"
    // },
    preset: 'ts-jest/presets/default-esm',
    globals: {
        'ts-jest/presets/default-esm': {
            tsconfig: 'tsconfig.release.json',
            useESM: true,
        },
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    roots: ['__tests__'],
    testRegex: '.(test|spec).(ts|js)x?$',
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.{ts,tsx,js,jsx}', '!src/**/*.d.ts'],
};
