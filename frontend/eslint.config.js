import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Stricter rules for unused variables and imports
      'no-unused-vars': 'off', // Turn off base rule, as @typescript-eslint/no-unused-vars is better
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_', // Allow unused parameters if they start with _
          varsIgnorePattern: '^_', // Allow unused variables if they start with _
          caughtErrorsIgnorePattern: '^_', // Allow unused catch arguments if they start with _
        },
      ],
      '@typescript-eslint/no-unused-imports': 'error', // Catch unused imports

      // Promote stronger typing
      '@typescript-eslint/no-explicit-any': 'warn', // Warn about 'any' usage
      '@typescript-eslint/no-non-null-assertion': 'warn', // Warn about non-null assertions
    },
  },
)
