/**
 * Environment Configuration
 * 
 * Centralized management of environment variables for Vite apps.
 * 
 * Note: 
 * - Vite apps (React/User): Use import.meta.env at runtime
 * - Angular apps: Should use environment files directly (environment.ts)
 *   Angular doesn't support process.env in browser runtime
 */

/**
 * Type guard to check if import.meta.env is available (Vite environment)
 */
const hasImportMetaEnv = (): boolean => {
  try {
    return typeof import.meta !== 'undefined' && 
           typeof (import.meta as any).env !== 'undefined';
  } catch {
    return false;
  }
};

/**
 * Get API URL from environment variables
 * 
 * This function is designed for Vite apps only.
 * Angular apps should use environment files (environment.ts) directly.
 * 
 * Note: Vite only exposes environment variables with VITE_ prefix
 */
export const getApiUrl = (): string => {
  // For Vite apps (React/User app) - runtime env variables
  if (hasImportMetaEnv()) {
    const viteEnv = (import.meta as any).env;
    if (viteEnv.VITE_API_URL) {
      return viteEnv.VITE_API_URL;
    }
  }
  
  // Fallback - this will be used if import.meta.env is not available
  // (e.g., during build time or in non-Vite environments)
  return 'http://localhost:8080';
};

/**
 * Get API timeout from environment variables
 * For Vite apps only. Angular apps should use environment files.
 */
export const getApiTimeout = (): number => {
  if (hasImportMetaEnv()) {
    const viteEnv = (import.meta as any).env;
    if (viteEnv.VITE_API_TIMEOUT) {
      return parseInt(viteEnv.VITE_API_TIMEOUT, 10);
    }
  }
  
  return 30000; // Default timeout
};

/**
 * Check if API logging is enabled
 * For Vite apps only. Angular apps should use environment files.
 */
export const isApiLoggingEnabled = (): boolean => {
  if (hasImportMetaEnv()) {
    const viteEnv = (import.meta as any).env;
    if (viteEnv.VITE_API_LOGGING) {
      return viteEnv.VITE_API_LOGGING === 'true';
    }
  }
  
  return false; // Default: logging disabled
};

/**
 * Get current environment (development, production, etc.)
 * For Vite apps only. Angular apps should use environment files.
 */
export const getEnvironment = (): string => {
  if (hasImportMetaEnv()) {
    const viteEnv = (import.meta as any).env;
    return viteEnv.MODE || viteEnv.NODE_ENV || 'development';
  }
  
  return 'development'; // Default
};

/**
 * Check if running in production
 */
export const isProduction = (): boolean => {
  return getEnvironment() === 'production';
};

