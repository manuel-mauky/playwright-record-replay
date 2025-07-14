import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

import fs from "node:fs"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    host: true,
    https: {
      key: fs.readFileSync("./certs/localhost.key"),
      cert: fs.readFileSync("./certs/localhost.crt"),
    },
  },
  preview: {
    port: 5173,
    host: true,
    https: {
      key: fs.readFileSync("./certs/localhost.key"),
      cert: fs.readFileSync("./certs/localhost.crt"),
    },
  },
})
