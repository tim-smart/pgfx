/// <reference types="vitest" />

import babel from "@vitejs/plugin-react"
import path from "path"
import { defineConfig } from "vite"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const babelConfig = require("./.babel.mjs.json")

export default defineConfig({
  plugins: [babel({ babel: babelConfig })],
  test: {
    include: ["packages/*/test/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@sqlfx/sql/test": path.join(__dirname, "packages/sql/test"),
      "@sqlfx/sql": path.join(__dirname, "packages/sql/src"),

      "@sqlfx/pg/test": path.join(__dirname, "packages/pg/test"),
      "@sqlfx/pg": path.join(__dirname, "packages/pg/src"),

      "@sqlfx/mssql/test": path.join(__dirname, "packages/mssql/test"),
      "@sqlfx/mssql": path.join(__dirname, "packages/mssql/src"),

      "@sqlfx/mysql/test": path.join(__dirname, "packages/mysql/test"),
      "@sqlfx/mysql": path.join(__dirname, "packages/mysql/src"),

      "@sqlfx/sqlite/test": path.join(__dirname, "packages/sqlite/test"),
      "@sqlfx/sqlite": path.join(__dirname, "packages/sqlite/src"),
    },
  },
})
