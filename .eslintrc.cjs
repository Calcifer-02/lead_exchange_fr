module.exports = {
  env: { browser: true, es2021: true, node: true },
  extends: ["eslint:recommended", "plugin:react/recommended", "prettier"],
  parser: "@babel/eslint-parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module", requireConfigFile: false },
  plugins: ["react"],
  rules: {}
};
