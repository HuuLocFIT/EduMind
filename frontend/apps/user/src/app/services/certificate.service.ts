import { apiClient } from "./api-client.service.js";
import { CERTIFICATE_ENDPOINTS } from "@edumind/shared-utils";

export interface CertificateVerificationResponse {
  courseTitle: string;
  studentName: string;
  instructorName: string;
  completionDate: string;
  certificateIssuedAt: string;
  isValid: boolean;
}

export const certificateService = {
  async regenerateCertificate(enrollmentId: number): Promise<void> {
    await apiClient.post(CERTIFICATE_ENDPOINTS.REGENERATE(enrollmentId));
  },

  async verifyCertificate(reference: string): Promise<CertificateVerificationResponse> {
    const response = await apiClient.get<CertificateVerificationResponse>(
      CERTIFICATE_ENDPOINTS.VERIFY(reference)
    );
    return response.data!;
  },
};
