/// <reference types="vite/client" />

/** .env で設定できる値 (import.meta.env.XXX). 例は .env.example を参照. */
interface ImportMetaEnv {
  /** 設定画面の「目安箱」ボタンのリンク先. 未設定ならボタンを出さない. */
  readonly VITE_FORM_URL?: string
  /** @deprecated 旧名. VITE_FORM_URL を使用してください. */
  readonly VUE_APP_FORM_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
