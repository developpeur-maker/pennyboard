/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PENNYLANE_API_KEY: string
  readonly VITE_PENNYLANE_BASE_URL: string
  readonly VITE_COMPANY_NAME: string
  readonly VITE_COMPANY_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
