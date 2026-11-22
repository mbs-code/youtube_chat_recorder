/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FORM_URL?: string
  /** @deprecated 旧名. VITE_FORM_URL を使用してください. */
  readonly VUE_APP_FORM_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
