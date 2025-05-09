import globals from 'globals'
import pluginJs from '@eslint/js'

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		languageOptions: {
			sourceType: 'module',
			globals: globals.browser,
		},
		rules: {
			semi: 'error',
			'no-console': 'error',
			'no-unused-vars': 'error',
			'no-var': 'error',
			'no-undef': 'error',
		},
	},
	pluginJs.configs.recommended,
]
