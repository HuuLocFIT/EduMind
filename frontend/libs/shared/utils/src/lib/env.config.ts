const env: Record<string, string | boolean> = 
  (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined' && import.meta.env) || {};

if (!('VITE_API_URL' in env) && typeof window !== 'undefined') {
  console.warn("⚠️ VITE_API_URL not found - this is expected in Angular apps");
}

export const API_URL: string = ('VITE_API_URL' in env ? String(env['VITE_API_URL']) : '');
export const isDev: boolean = ('DEV' in env ? Boolean(env['DEV']) : false);
export const isProd: boolean = ('PROD' in env ? Boolean(env['PROD']) : false);