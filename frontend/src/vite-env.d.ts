/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_SKIP_MIC: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
