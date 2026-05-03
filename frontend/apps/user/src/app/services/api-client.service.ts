import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  JwtResponseSchema,
  RefreshTokenResponseSchema,
  MessageResponseSchema,
  Setup2FAResponseSchema,
  ApiErrorSchema,
  type ApiError,
  RefreshTokenResponse,
} from '@edumind/shared-types';
import { 
  unwrapApiResponse, 
  AUTH_ENDPOINTS, 
  API_URL,
} from '@edumind/shared-utils';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // IMPORTANT: Send cookies with every request
});

// Track ongoing refresh token request to avoid multiple simultaneous refreshes
let refreshTokenPromise: Promise<string> | null = null;

/**
 * Refresh access token using refresh token from HTTP-Only cookie
 * Uses a promise cache to prevent multiple simultaneous refresh requests
 */
async function refreshAccessToken(): Promise<string> {
  // If there's already a refresh in progress, wait for it
  if (refreshTokenPromise) {
    return refreshTokenPromise;
  }

  // Create new refresh request
  refreshTokenPromise = axios
    .post(
      `${API_URL}${AUTH_ENDPOINTS.REFRESH}`,
      {},
      { withCredentials: true }
    )
    .then((response) => {
      const data = unwrapApiResponse(response.data);
      const newAccessToken = (data as RefreshTokenResponse).accessToken;
      localStorage.setItem('accessToken', newAccessToken);
      return newAccessToken;
    })
    .finally(() => {
      // Clear the promise cache after refresh completes (success or failure)
      refreshTokenPromise = null;
    });

  return refreshTokenPromise;
}

// Request interceptor - Add access token to requests (except auth endpoints)
apiClient.interceptors.request.use(
  (config) => {
    const endpoint = config.url || '';
    
    // Don't add token to auth endpoints (login, signup, 2FA login, etc.)
    const isAuthEndpoint = 
      endpoint.includes(AUTH_ENDPOINTS.LOGIN) ||
      endpoint.includes(AUTH_ENDPOINTS.SIGNUP) ||
      endpoint.includes(AUTH_ENDPOINTS.LOGIN_2FA) ||
      endpoint.includes(AUTH_ENDPOINTS.FORGOT_PASSWORD) ||
      endpoint.includes(AUTH_ENDPOINTS.RESET_PASSWORD) ||
      endpoint.includes(AUTH_ENDPOINTS.VERIFY_EMAIL) ||
      endpoint.includes(AUTH_ENDPOINTS.RESEND_VERIFICATION) ||
      endpoint.includes('/auth/oauth2');
    
    if (!isAuthEndpoint) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Validate with Zod & handle token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    response.data = unwrapApiResponse(response.data);
    const endpoint = response.config.url;

    // Validate auth responses (login, OAuth2, 2FA)
    if (
      endpoint?.includes(AUTH_ENDPOINTS.LOGIN) ||
      endpoint?.includes(AUTH_ENDPOINTS.SIGNUP) ||
      endpoint?.includes('/auth/oauth2') ||
      endpoint?.includes(AUTH_ENDPOINTS.LOGIN_2FA)
    ) {
      // Check if response is 2FA required (has requires2FA field)
      if (response.data && typeof response.data === 'object' && 'requires2FA' in response.data && response.data.requires2FA === true) {
        // This is a TwoFactorRequiredResponse, don't validate as JwtResponse
        // Just return it as is
        return response;
      }
      
      // Otherwise, validate as JwtResponse
      const result = JwtResponseSchema.safeParse(response.data);
      if (result.success) {
        // Store access token and user info
        // NOTE: refreshToken is NOT in response - it's in HTTP-Only Cookie
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        response.data = result.data;
      }
    }

    // Validate refresh response
    if (endpoint?.includes(AUTH_ENDPOINTS.REFRESH)) {
      const result = RefreshTokenResponseSchema.safeParse(response.data);
      if (result.success) {
        localStorage.setItem('accessToken', result.data.accessToken);
        response.data = result.data;
      }
    }

    // Validate message responses
    if (
      endpoint?.includes(AUTH_ENDPOINTS.FORGOT_PASSWORD) ||
      endpoint?.includes(AUTH_ENDPOINTS.RESET_PASSWORD) ||
      endpoint?.includes(AUTH_ENDPOINTS.VERIFY_EMAIL) ||
      endpoint?.includes(AUTH_ENDPOINTS.RESEND_VERIFICATION) ||
      endpoint?.includes(AUTH_ENDPOINTS.VERIFY_2FA) ||
      endpoint?.includes(AUTH_ENDPOINTS.DISABLE_2FA) ||
      endpoint?.includes(AUTH_ENDPOINTS.LOGOUT)
    ) {
      const result = MessageResponseSchema.safeParse(response.data);
      if (result.success) {
        response.data = result.data;
      }
    }

    // Validate 2FA setup response
    if (endpoint?.includes(AUTH_ENDPOINTS.SETUP_2FA)) {
      const result = Setup2FAResponseSchema.safeParse(response.data);
      if (result.success) {
        response.data = result.data;
      }
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    const endpoint = originalRequest?.url || '';

    // Validate error response first to get errorCode
    let apiError: ApiError | null = null;
    if (error.response?.data) {
      const result = ApiErrorSchema.safeParse(error.response.data);
      if (result.success) {
        apiError = result.data;
      }
    }

    // Skip token refresh for auth endpoints (login, signup, etc.)
    // These endpoints should not trigger automatic token refresh
    const isAuthEndpoint = 
      endpoint?.includes(AUTH_ENDPOINTS.LOGIN) ||
      endpoint?.includes(AUTH_ENDPOINTS.SIGNUP) ||
      endpoint?.includes(AUTH_ENDPOINTS.LOGIN_2FA) ||
      endpoint?.includes(AUTH_ENDPOINTS.REFRESH) ||
      endpoint?.includes('/auth/oauth2') ||
      endpoint?.includes(AUTH_ENDPOINTS.FORGOT_PASSWORD) ||
      endpoint?.includes(AUTH_ENDPOINTS.RESET_PASSWORD) ||
      endpoint?.includes(AUTH_ENDPOINTS.VERIFY_EMAIL) ||
      endpoint?.includes(AUTH_ENDPOINTS.RESEND_VERIFICATION);

    // Check if token expired
    // Only refresh if:
    // 1. Error code is TOKEN_EXPIRED (ERR_2002), OR
    // 2. 401 status on non-auth endpoints (likely token expired)
    // Do NOT refresh for INVALID_CREDENTIALS (ERR_2001) or AUTH_FAILED (ERR_2000)
    const isTokenExpired = 
      !isAuthEndpoint && // Never refresh for auth endpoints
      !originalRequest._retry && // Prevent infinite retry loops
      (
        apiError?.errorCode === 'ERR_2002' || // TOKEN_EXPIRED
        (error.response?.status === 401 && 
         apiError?.errorCode !== 'ERR_2001' && // INVALID_CREDENTIALS
         apiError?.errorCode !== 'ERR_2000')   // AUTH_FAILED
      );

    if (isTokenExpired) {
      originalRequest._retry = true;

      try {
        // Use the shared refresh function to avoid duplicate requests
        const newAccessToken = await refreshAccessToken();

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear ALL auth state from storage
        // IMPORTANT: Must also clear 'auth-storage' (Zustand persist key)
        // to prevent isAuthenticated from rehydrating as true
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
        // Dispatch a custom event so the auth store can do a client-side redirect
        // (avoids a full page reload that would re-run addInitScript in E2E tests)
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(refreshError);
      }
    }

    // Throw the validated error or fallback error
    if (apiError) {
      throw apiError;
    }

    // Fallback error
    throw {
      message: error.message || 'Network error',
      status: error.response?.status || 0,
      timestamp: new Date().toISOString(),
    } as ApiError;
  }
);