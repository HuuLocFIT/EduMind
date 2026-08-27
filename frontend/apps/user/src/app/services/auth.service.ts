import { apiClient, refreshAuthSession, clearStoredAuth } from "./api-client.service.js";
import { getStoredAccessToken, getStoredUser } from "./auth-storage.util.js";
import type {
  SignupRequest,
  LoginRequest,
  TwoFactorLoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ResendVerificationRequest,
  Verify2FACodeRequest,
  MessageResponse,
  Setup2FAResponse,
  JwtResponse,
  ChangePasswordRequest,
  UpdateProfileRequest,
  User,
} from "@edumind/shared-types";
import {
  AUTH_ENDPOINTS,
  USER_ENDPOINTS,
  getOAuth2Url,
  API_URL,
} from "@edumind/shared-utils";

export const authService = {
  // ========== BASIC AUTH ==========
  async signup(data: SignupRequest): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.SIGNUP,
      data
    );
    return response.data;
  },

  async login(data: LoginRequest): Promise<JwtResponse | { requires2FA: boolean; email: string; message: string }> {
    const response = await apiClient.post<JwtResponse | { requires2FA: boolean; email: string; message: string }>(
      AUTH_ENDPOINTS.LOGIN,
      data
    );
    return response.data;
  },

  async logout(): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.LOGOUT
    );
    clearStoredAuth();
    return response.data;
  },

  // Delegates to the single refresh pipeline in api-client.service.ts — it dedupes
  // concurrent callers and keeps the auth store's user snapshot in sync with the new token.
  refreshToken: refreshAuthSession,

  // ========== PASSWORD RESET ==========

  async forgotPassword(data: ForgotPasswordRequest): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.FORGOT_PASSWORD,
      data
    );
    return response.data;
  },

  async resetPassword(data: ResetPasswordRequest): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.RESET_PASSWORD,
      data
    );
    return response.data;
  },

  async validateResetToken(token: string): Promise<{ email: string }> {
    const response = await apiClient.get<{ email: string }>(
      AUTH_ENDPOINTS.VALIDATE_RESET_TOKEN,
      { params: { token } }
    );
    return response.data;
  },

  // ========== EMAIL VERIFICATION ==========

  async verifyEmail(token: string): Promise<MessageResponse> {
    const response = await apiClient.get<MessageResponse>(
      AUTH_ENDPOINTS.VERIFY_EMAIL,
      { params: { token } }
    );
    return response.data;
  },

  async resendVerification(
    data: ResendVerificationRequest
  ): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.RESEND_VERIFICATION,
      data
    );
    return response.data;
  },

  // ========== 2FA ==========

  async setup2FA(): Promise<Setup2FAResponse> {
    const response = await apiClient.post<Setup2FAResponse>(
      AUTH_ENDPOINTS.SETUP_2FA
    );
    return response.data;
  },

  async verify2FASetup(data: Verify2FACodeRequest): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.VERIFY_2FA,
      data
    );
    return response.data;
  },

  async loginWith2FA(data: TwoFactorLoginRequest): Promise<JwtResponse> {
    const response = await apiClient.post<JwtResponse>(
      AUTH_ENDPOINTS.LOGIN_2FA,
      data
    );
    return response.data;
  },

  async disable2FA(data: { password: string; code: string }): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.DISABLE_2FA,
      data
    );
    return response.data;
  },

  async getBackupCodes(): Promise<{ backupCodes: string[] }> {
    const response = await apiClient.post<{ backupCodes: string[] }>(
      AUTH_ENDPOINTS.BACKUP_CODES
    );
    return response.data;
  },

  // ========== OAUTH2 ==========

  getGoogleOAuthUrl(): string {
    return getOAuth2Url("google", API_URL);
  },

  getFacebookOAuthUrl(): string {
    return getOAuth2Url("facebook", API_URL);
  },

  // Handle OAuth2 callback (called from OAuth2CallbackPage)
  async handleOAuth2Callback(
    provider: "google" | "facebook",
    code: string
  ): Promise<JwtResponse> {
    const response = await apiClient.get<JwtResponse>(
      AUTH_ENDPOINTS.OAUTH2_CALLBACK(provider),
      { params: { code } }
    );
    return response.data;
  },

  // ========== USER INFO ==========

  async fetchCurrentUser(): Promise<any> {
    const response = await apiClient.get<any>(USER_ENDPOINTS.ME);
    return response.data;
  },

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await apiClient.put<User>(
      USER_ENDPOINTS.UPDATE_PROFILE(),
      data
    );
    // Callers update the auth store's user snapshot themselves (e.g. ProfileTab.tsx calls
    // setUser()) — that's what persists it into 'auth-storage', the single source of truth.
    return response.data;
  },

  async changePassword(data: ChangePasswordRequest): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      USER_ENDPOINTS.CHANGE_PASSWORD,
      data
    );
    return response.data;
  },

  async deleteAccount(): Promise<MessageResponse> {
    const response = await apiClient.delete<MessageResponse>(
      USER_ENDPOINTS.DELETE_ACCOUNT
    );
    // Clear all auth data after account deletion
    this.clearAuth();
    return response.data;
  },
  // ========== HELPERS ==========

  getCurrentUser() {
    return getStoredUser();
  },

  getAccessToken(): string | null {
    return getStoredAccessToken();
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },

  clearAuth(): void {
    clearStoredAuth();
  },
};

export type AuthService = typeof authService;
