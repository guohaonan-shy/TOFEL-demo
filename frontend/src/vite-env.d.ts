/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_SKIP_MIC: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
