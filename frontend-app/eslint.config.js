import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'src/features/chat/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Dialogs initialize form state when they open. This is intentional and
      // covered by component tests; the generic compiler rule rejects that pattern.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['src/components/ui/{badge,button,tabs}.tsx'],
    rules: {
      // shadcn exports variant helpers together with their components by design.
      'react-refresh/only-export-components': 'off',
    },
  },
])
