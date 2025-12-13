// Type definitions for Vite environment variables
// Extends ImportMeta to include env property for use with shared-utils

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv & {
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly MODE: string;
  };
}

