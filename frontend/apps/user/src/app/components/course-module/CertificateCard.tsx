/** @format */

import { EnrollmentResponse } from "@edumind/shared-types";
import { Button, Card } from "@edumind/user-ui";
import { Award, Calendar, Download, Share2 } from "lucide-react";

interface CertificateCardProps {
  enrollment: EnrollmentResponse;
  onDownload: () => void;
  onShare: () => void;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  enrollment,
  onDownload,
  onShare,
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      {/* Certificate Preview */}
      <div className="relative h-48 bg-gradient-to-br from-purple-600 to-blue-600 rounded-t-lg overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
          <Award className="w-16 h-16 mb-3" />
          <h3 className="font-bold text-center text-lg line-clamp-2">
            {enrollment.courseTitle}
          </h3>
        </div>

        {/* Watermark */}
        <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
          Certificate
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Calendar className="w-4 h-4" />
          <span>
            Completed:{" "}
            {new Date(
              enrollment.completedAt || enrollment.enrolledAt
            ).toLocaleDateString()}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={onDownload}
            className="flex-1"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="secondary" onClick={onShare} size="sm">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
