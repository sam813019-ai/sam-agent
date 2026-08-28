/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ELDEN_ACCESS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
