const env = (typeof import.meta !== 'undefined' && import.meta.env) as Record<string, string>;

if (env["VITE_API_URL"] === undefined && typeof window !== 'undefined') { 
  console.warn("⚠️ VITE_API_URL not found - this is expected in Angular apps");
}

export const API_URL = env["VITE_API_URL"] || '';
export const isDev = env["DEV"] ?? false;
export const isProd = env["PROD"] ?? false;