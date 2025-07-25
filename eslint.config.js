import pluginSecurity from "eslint-plugin-security"; 
import { defineConfig } from "eslint/config"; 
export default defineConfig([ 
{ 
  files: ["**/*.js"], 
  plugins: { security: pluginSecurity }, 
  rules: { 
    ...pluginSecurity.configs.recommended.rules, 
    "security/detect-eval-with-expression": "error" 
  } 
} 
]); 
