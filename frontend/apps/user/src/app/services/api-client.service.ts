import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  JwtResponseSchema,
  RefreshTokenResponseSchema,
  MessageResponseSchema,
  Setup2FAResponseSchema,
  ApiErrorSchema,
  type ApiError,
} from '@edumind/shared-types';
import { unwrapApiResponse, AUTH_ENDPOINTS, getApiUrl } from '@edumind/shared-utils';

const API_URL = getApiUrl();

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For refresh token cookie
});

// Request interceptor - Add access token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

    // Validate auth responses
    if (
      endpoint?.includes(AUTH_ENDPOINTS.LOGIN) ||
      endpoint?.includes(AUTH_ENDPOINTS.SIGNUP) ||
      endpoint?.includes('/auth/oauth2') ||
      endpoint?.includes(AUTH_ENDPOINTS.LOGIN_2FA)
    ) {
      const result = JwtResponseSchema.safeParse(response.data);
      if (result.success) {
        // Store tokens
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('refreshToken', result.data?.refreshToken || 'null');
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

    // Token expired - try refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${API_URL}${AUTH_ENDPOINTS.REFRESH}`,
            { refreshToken },
            { withCredentials: true }
          );

          const newAccessToken = response.data.accessToken;
          localStorage.setItem('accessToken', newAccessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Validate error response
    if (error.response?.data) {
      const result = ApiErrorSchema.safeParse(error.response.data);
      if (result.success) {
        throw result.data;
      }
    }

    // Fallback error
    throw {
      message: error.message || 'Network error',
      status: error.response?.status || 0,
      timestamp: new Date().toISOString(),
    } as ApiError;
  }
);