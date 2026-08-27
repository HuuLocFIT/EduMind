// Type definitions for Vite environment variables
// This ensures import.meta.env works across all apps (user, admin, etc.)

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ADMIN_PORTAL_URL: string;
  // Add other env variables here as needed
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv & {
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly MODE: string;
  };
}

