const env = (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined' && import.meta.env) || {};

if (!('VITE_API_URL' in env) && typeof window !== 'undefined') {
  console.warn("⚠️ VITE_API_URL not found - this is expected in Angular apps");
}

export const API_URL = 'VITE_API_URL' in env ? env['VITE_API_URL'] : '';
export const isDev = 'DEV' in env ? env['DEV'] : false;
export const isProd = 'PROD' in env ? env['PROD'] : false;