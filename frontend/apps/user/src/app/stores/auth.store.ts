import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, LoginRequest, SignupRequest, TwoFactorLoginRequest } from "@edumind/shared-types";
import { authService } from "@user/services/index";
import { queryClient } from "../lib/query-client";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  loginWith2FA: (credentials: TwoFactorLoginRequest) => Promise<void>;
  loginWithOAuth2: (token: string) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(credentials);

          // Save tokens
          localStorage.setItem("accessToken", response.accessToken);

          set({
            user: response.user,
            accessToken: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || "Login failed";
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      loginWith2FA: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.loginWith2FA(credentials);

          // Save tokens
          localStorage.setItem("accessToken", response.accessToken);
          const user = await authService.fetchCurrentUser();
          localStorage.setItem('user', JSON.stringify(user.data));

          set({
            user: user.data,
            accessToken: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || "2FA verification failed";
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      loginWithOAuth2: async (token) => {
        set({ isLoading: true, error: null });
        try {
          // Save access token
          localStorage.setItem("accessToken", token);

          // Fetch user info using the token
          const userResponse = await authService.fetchCurrentUser();
          const user = userResponse;

          // Save user to localStorage
          localStorage.setItem("user", JSON.stringify(user));

          set({
            user,
            accessToken: token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');

          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'OAuth2 login failed',
          });

          const errorMessage = error.response?.data?.message || error.message || "OAuth2 login failed";
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.signup(data);

          set({ isLoading: false });
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || "Signup failed";
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          // Clear all auth data
          localStorage.removeItem("accessToken");
          localStorage.removeItem('user');
          // Clear React Query cache to avoid showing stale user data after logout
          queryClient.clear();

          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user) => set({ user }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
