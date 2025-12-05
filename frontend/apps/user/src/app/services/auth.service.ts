import { apiClient } from "./api-client.service.js";
import type {
  SignupRequest,
  LoginRequest,
  TwoFactorLoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  Verify2FACodeRequest,
  RefreshTokenResponse,
  MessageResponse,
  Setup2FAResponse,
  JwtResponse,
  ChangePasswordRequest,
  UpdateProfileRequest,
  FileUploadResponse,
  User,
} from "@edumind/shared-types";
import {
  AUTH_ENDPOINTS,
  USER_ENDPOINTS,
  UPLOAD_ENDPOINTS,
  getOAuth2Url,
  getApiUrl,
} from "@edumind/shared-utils";

const API_URL = getApiUrl();  

class AuthService {

  // ========== BASIC AUTH ==========

  static async signup(data: SignupRequest): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.SIGNUP,
      data
    );
    return response.data;
  }

  static async login(data: LoginRequest): Promise<JwtResponse> {
    const response = await apiClient.post<JwtResponse>(
      AUTH_ENDPOINTS.LOGIN,
      data
    );
    return response.data;
  }

  static async logout(): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.LOGOUT
    );
    localStorage.clear();
    return response.data;
  }

  static async refreshToken(): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>(
      AUTH_ENDPOINTS.REFRESH,
      {} // Empty body - cookie is sent automatically
    );
    return response.data;
  }

  // ========== PASSWORD RESET ==========

  static async forgotPassword(
    data: ForgotPasswordRequest
  ): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.FORGOT_PASSWORD,
      data
    );
    return response.data;
  }

  static async resetPassword(
    data: ResetPasswordRequest
  ): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.RESET_PASSWORD,
      data
    );
    return response.data;
  }

  // ========== EMAIL VERIFICATION ==========

  static async verifyEmail(data: VerifyEmailRequest): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.VERIFY_EMAIL,
      data
    );
    return response.data;
  }

  static async resendVerification(
    data: ResendVerificationRequest
  ): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.RESEND_VERIFICATION,
      data
    );
    return response.data;
  }

  // ========== 2FA ==========

  static async setup2FA(): Promise<Setup2FAResponse> {
    const response = await apiClient.post<Setup2FAResponse>(
      AUTH_ENDPOINTS.SETUP_2FA
    );
    return response.data;
  }

  static async verify2FASetup(
    data: Verify2FACodeRequest
  ): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.VERIFY_2FA,
      data
    );
    return response.data;
  }

  static async loginWith2FA(
    data: TwoFactorLoginRequest
  ): Promise<JwtResponse> {
    const response = await apiClient.post<JwtResponse>(
      AUTH_ENDPOINTS.LOGIN_2FA,
      data
    );
    return response.data;
  }

  static async disable2FA(): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      AUTH_ENDPOINTS.DISABLE_2FA
    );
    return response.data;
  }

  static async getBackupCodes(): Promise<{ backupCodes: string[] }> {
    const response = await apiClient.post<{ backupCodes: string[] }>(
      AUTH_ENDPOINTS.BACKUP_CODES
    );
    return response.data;
  }

  // ========== OAUTH2 ==========

  static getGoogleOAuthUrl(): string {
    return getOAuth2Url('google', API_URL);
  }

  static getFacebookOAuthUrl(): string {
    return getOAuth2Url('facebook', API_URL);
  }

  // Handle OAuth2 callback (called from OAuth2CallbackPage)
  static async handleOAuth2Callback(
    provider: "google" | "facebook",
    code: string
  ): Promise<JwtResponse> {
    const response = await apiClient.get<JwtResponse>(
      AUTH_ENDPOINTS.OAUTH2_CALLBACK(provider),
      { params: { code } }
    );
    return response.data;
  }

  // ========== USER INFO ==========

  static async fetchCurrentUser(): Promise<any> {
    const response = await apiClient.get<any>(USER_ENDPOINTS.ME);
    return response.data;
  }

  static async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await apiClient.put<User>(
      USER_ENDPOINTS.UPDATE_PROFILE(),
      data
    );
    localStorage.setItem("user", JSON.stringify(response.data));
    return response.data;
  }

  static async changePassword(data: ChangePasswordRequest): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(
      USER_ENDPOINTS.CHANGE_PASSWORD,
      data
    );
    return response.data;
  }

  static async uploadProfileImage(file: File): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<FileUploadResponse>(
      UPLOAD_ENDPOINTS.IMAGE,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

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
