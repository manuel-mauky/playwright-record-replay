import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import fs from "node:fs"

const CERTS_FOLDER_PATH = path.join("..", "..", "kanidm", "data")
const KEY_PATH = path.join(CERTS_FOLDER_PATH, "localhost.key")
const CERT_PATH = path.join(CERTS_FOLDER_PATH, "localhost.crt")

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    host: true,
    https: {
      key: fs.readFileSync(KEY_PATH),
      cert: fs.readFileSync(CERT_PATH),
    },
  },
  preview: {
    port: 5173,
    host: true,
    https: {
      key: fs.readFileSync(KEY_PATH),
      cert: fs.readFileSync(CERT_PATH),
    },
  },
})
