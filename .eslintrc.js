// https://eslint.org/docs/user-guide/configuring
// File taken from https://github.com/vuejs-templates/webpack/blob/1.3.1/template/.eslintrc.js, thanks.

module.exports = {
  root: true,
  parser:  'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser'
  },
  env: {
    browser: true,
    webextensions: true,
  },
  extends: [
    'plugin:vue/recommended',
    'standard',
    'plugin:@typescript-eslint/recommended',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended',
  ],
  plugins: [
    'vue'
  ],
  rules: {
    'generator-star-spacing': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'prettier/prettier': [
      'error',
      {
        'singleQuote': true,
        'semi': false
      }
    ],
    "vue/max-attributes-per-line": [
      "error",
      {
        "singleline": 3,
      }
    ],
  }
}
