import pluginSecurity from "eslint-plugin-security";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.js"],
    plugins: { security: pluginSecurity },
    rules: {
      ...pluginSecurity.configs.recommended.rules,
      // You can override or add specific rules here if needed
      // For example, to turn a rule off:
      // "security/detect-object-injection": "off"
    },
  },
]);
