/** @format */

import { useState } from "react";
import { EnrollmentResponse } from "@edumind/shared-types";
import { Button, Card, useToast } from "@edumind/user-ui";
import { formatDate, formatDateTime } from "@edumind/shared-utils";
import { Award, Calendar, Download, RefreshCw, Share2 } from "lucide-react";
import { certificateService } from "../../services/certificate.service";
import { EnrollmentStatus } from "@edumind/shared-constants";

interface CertificateCardProps {
  enrollment: EnrollmentResponse;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  enrollment,
}) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { success: showSuccess, error: showError } = useToast();

  const isCompleted = enrollment.status === EnrollmentStatus.COMPLETED;
  const hasCertificate = enrollment.courseHasCertificate === true;
  const isGenerating = !enrollment.certificateUrl && isCompleted && hasCertificate;

  const handleDownload = () => {
    window.open(enrollment.certificateUrl!, "_blank");
  };

  const handleShare = () => {
    const url = `${window.location.origin}/certificates/verify/${enrollment.certificateReference}`;
    navigator.clipboard.writeText(url).then(() => {
      showSuccess("Verification link copied to clipboard!");
    });
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await certificateService.regenerateCertificate(enrollment.id);
      showSuccess("Certificate regeneration started \u2014 this may take a moment");
    } catch {
      showError("Failed to regenerate certificate");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden" padding="none">
      <div className="relative h-48 bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
          <Award className="w-16 h-16 mb-3" />
          <h3 className="font-bold text-center text-lg line-clamp-2">
            {enrollment.courseTitle}
          </h3>
        </div>

        <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
          Certificate
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
          <Calendar className="w-4 h-4" />
          <span>
            Completed:{" "}
            {formatDate(enrollment.completedAt || enrollment.enrolledAt)}
          </span>
        </div>
        {enrollment.certificateIssuedAt && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Calendar className="w-4 h-4" />
            <span>Issued: {formatDateTime(enrollment.certificateIssuedAt)}</span>
          </div>
        )}

        {isGenerating ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-3">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Generating certificate...</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleDownload}
              className="flex-1"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            {enrollment.certificateReference && (
              <Button variant="secondary" onClick={handleShare} size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
            )}
            {isCompleted && hasCertificate && (
              <Button
                variant="secondary"
                onClick={handleRegenerate}
                size="sm"
                disabled={isRegenerating}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`}
                />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
