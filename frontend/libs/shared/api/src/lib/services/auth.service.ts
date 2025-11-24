import { apiClient } from "../api-client.js";
import type {
  SignupRequest,
  LoginRequest,
  TwoFactorLoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  Verify2FACodeRequest,
  AuthResponse,
  RefreshTokenResponse,
  MessageResponse,
  Setup2FAResponse,
} from "@edumind/shared-types";

const API_URL = import.meta.env['VITE_API_URL'] || import.meta.env['NX_API_URL'] || "http://localhost:8080";  

class AuthService {
  private static readonly BASE_PATH = "/api/auth";

  // ========== BASIC AUTH ==========

  static async signup(data: SignupRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      `${this.BASE_PATH}/signup`,
      data
    );
    return response.data;
  }

  static async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      `${this.BASE_PATH}/login`,
      data
    );
    return response.data;
  }

  static async logout(): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      `${this.BASE_PATH}/logout`
    );
    localStorage.clear();
    return response.data;
  }

  static async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = localStorage.getItem("refreshToken");
    const response = await apiClient.post<RefreshTokenResponse>(
      `${this.BASE_PATH}/refresh`,
      { refreshToken }
    );
    return response.data;
  }

  // ========== PASSWORD RESET ==========

  static async forgotPassword(
    data: ForgotPasswordRequest
  ): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      `${this.BASE_PATH}/forgot-password`,
      data
    );
    return response.data;
  }

  static async resetPassword(
    data: ResetPasswordRequest
  ): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      `${this.BASE_PATH}/reset-password`,
      data
    );
    return response.data;
  }

  // ========== EMAIL VERIFICATION ==========

  static async verifyEmail(data: VerifyEmailRequest): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      `${this.BASE_PATH}/verify-email`,
      data
    );
    return response.data;
  }

  static async resendVerification(
    data: ResendVerificationRequest
  ): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      `${this.BASE_PATH}/resend-verification`,
      data
    );
    return response.data;
  }

  // ========== 2FA ==========

  static async setup2FA(): Promise<Setup2FAResponse> {
    const response = await apiClient.post<Setup2FAResponse>(
      `${this.BASE_PATH}/2fa/setup`
    );
    return response.data;
  }

  static async verify2FASetup(
    data: Verify2FACodeRequest
  ): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      `${this.BASE_PATH}/2fa/verify`,
      data
    );
    return response.data;
  }

  static async loginWith2FA(
    data: TwoFactorLoginRequest
  ): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      `${this.BASE_PATH}/2fa/login`,
      data
    );
    return response.data;
  }

  static async disable2FA(): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      `${this.BASE_PATH}/2fa/disable`
    );
    return response.data;
  }

  static async getBackupCodes(): Promise<{ backupCodes: string[] }> {
    const response = await apiClient.post<{ backupCodes: string[] }>(
      `${this.BASE_PATH}/2fa/backup-codes`
    );
    return response.data;
  }

  // ========== OAUTH2 ==========

  static getGoogleOAuthUrl(): string {
    return `${API_URL}${this.BASE_PATH}/oauth2/google`;
  }

  static getFacebookOAuthUrl(): string {
    return `${API_URL}${this.BASE_PATH}/oauth2/facebook`;
  }

  // Handle OAuth2 callback (called from OAuth2CallbackPage)
  static async handleOAuth2Callback(
    provider: "google" | "facebook",
    code: string
  ): Promise<AuthResponse> {
    const response = await apiClient.get<AuthResponse>(
      `${this.BASE_PATH}/oauth2/callback/${provider}`,
      { params: { code } }
    );
    return response.data;
  }

  // ========== USER INFO ==========

  static async fetchCurrentUser(): Promise<any> {
    const response = await apiClient.get<any>("/api/users/me");
    return response.data;
  }

  // ========== HELPERS ==========

  static getCurrentUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  static getAccessToken(): string | null {
    return localStorage.getItem("accessToken");
  }

  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  static clearAuth(): void {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }
}

export default AuthService;
