const js = require("@eslint/js");
const reactPlugin = require("eslint-plugin-react");
const prettierConfig = require("eslint-config-prettier");

// Node 18+ ships fetch, AbortController, Headers, etc. as globals.
const nodeGlobals = {
  require: "readonly",
  module: "readonly",
  exports: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
  process: "readonly",
  console: "readonly",
  Buffer: "readonly",
  global: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  setImmediate: "readonly",
  clearImmediate: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  fetch: "readonly",
  Headers: "readonly",
  Request: "readonly",
  Response: "readonly",
  AbortController: "readonly",
  AbortSignal: "readonly",
};

const browserGlobals = {
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  location: "readonly",
  history: "readonly",
  fetch: "readonly",
  Headers: "readonly",
  Request: "readonly",
  Response: "readonly",
  localStorage: "readonly",
  sessionStorage: "readonly",
  console: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  FormData: "readonly",
  Blob: "readonly",
  File: "readonly",
  Event: "readonly",
  CustomEvent: "readonly",
  AbortController: "readonly",
  performance: "readonly",
};

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "client/dist/**",
      "dist-electron/**",
      "prisma/migrations/**",
    ],
  },

  // ESLint recommended rules applied to all JS/JSX
  {
    ...js.configs.recommended,
    files: ["**/*.{js,jsx}"],
    rules: {
      ...js.configs.recommended.rules,
      // Allow _-prefixed names to mark intentionally unused vars/args
      // (e.g. Express error handlers that must declare `next` for the
      // 4-argument signature even when the handler never calls it)
      "no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
    },
  },

  // Node.js environment — server, electron, scripts, ai, root config files
  {
    files: [
      "server/**/*.js",
      "electron/**/*.js",
      "scripts/**/*.js",
      "prisma/**/*.js",
      "ai/**/*.js",
      "*.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: nodeGlobals,
    },
    rules: {
      "no-console": "off",
    },
  },

  // Root-level vite.config.js uses ESM (import/export), not CJS
  {
    files: ["vite.config.js"],
    languageOptions: {
      sourceType: "module",
    },
  },

  // React client (ESM + JSX)
  {
    files: ["client/**/*.{js,jsx}"],
    plugins: { react: reactPlugin },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: browserGlobals,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",  // not needed with React 17+ JSX transform
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off", // apostrophes in JSX text are fine
    },
  },

  // client/tailwind.config.js is a CJS file despite living in client/
  {
    files: ["client/tailwind.config.js", "client/postcss.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: nodeGlobals,
    },
  },

  // Prettier must be last — disables rules that conflict with formatting
  prettierConfig,
];
