import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Award, CheckCircle, XCircle, Calendar, User, BookOpen, ShieldCheck } from "lucide-react";
import { SeoMetaTags } from "../../components/Seo/SeoMetaTags";
import { certificateService } from "../../services/certificate.service";
import { queryKeys } from "../../lib/query-keys";
import { formatDate, formatDateTime } from "@edumind/shared-utils";

export const CertificateVerifyPage: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.certificates.verify(reference!),
    queryFn: () => certificateService.verifyCertificate(reference!),
    enabled: Boolean(reference),
    retry: 1,
  });

  if (isLoading) {
    return <CertificateVerifySkeleton />;
  }

  if (isError || !data) {
    return (
      <>
        <SeoMetaTags
          title="Certificate Verification Failed"
          description="This certificate could not be verified."
          noIndex
        />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <XCircle className="w-20 h-20 text-red-400 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Certificate Not Found
            </h1>
            <p className="text-gray-600 mb-8">
              We couldn&apos;t verify this certificate. The link may be invalid or the certificate has been removed.
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SeoMetaTags
        title={`Certificate: ${data.courseTitle}`}
        description={`Verify certificate of completion for ${data.courseTitle}`}
        noIndex
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Status Badge */}
          <div className="text-center mb-8">
            {data.isValid ? (
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Verified Certificate
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium">
                <XCircle className="w-4 h-4" />
                Invalid Certificate
              </div>
            )}
          </div>

          {/* Certificate Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-10 text-center text-white">
              <Award className="w-16 h-16 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Certificate of Completion</h1>
              <p className="text-purple-100">Verified by EduMind</p>
            </div>

            {/* Content */}
            <div className="px-8 py-8 space-y-6">
              {/* Course Title */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Course</p>
                <h2 className="text-2xl font-bold text-gray-900">{data.courseTitle}</h2>
              </div>

              <div className="border-t border-gray-100" />

              {/* Student Name */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Student</p>
                  <p className="font-semibold text-gray-900">{data.studentName}</p>
                </div>
              </div>

              {/* Instructor */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Instructor</p>
                  <p className="font-semibold text-gray-900">{data.instructorName}</p>
                </div>
              </div>

              {/* Completion Date */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completion Date</p>
                  <p className="font-semibold text-gray-900">
                    {data.completionDate ? formatDate(data.completionDate) : "N/A"}
                  </p>
                </div>
              </div>

              {/* Issued Date */}
              {data.certificateIssuedAt && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Certificate Issued</p>
                    <p className="font-semibold text-gray-900">
                      {formatDateTime(data.certificateIssuedAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* Reference */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Reference: {reference}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-400 mt-6">
            EduMind is not an accredited institution. This certificate is not an official degree or diploma.
          </p>
        </div>
      </div>
    </>
  );
};

function CertificateVerifySkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4 py-12" aria-hidden="true">
      <div className="w-full max-w-2xl animate-pulse">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-10">
            <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4" />
            <div className="h-8 bg-white/20 rounded-lg w-64 mx-auto mb-2" />
            <div className="h-4 bg-white/20 rounded w-40 mx-auto" />
          </div>
          <div className="px-8 py-8 space-y-6">
            <div className="h-6 bg-gray-200 rounded w-48 mx-auto" />
            <div className="border-t border-gray-100" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-16 mb-1" />
                  <div className="h-4 bg-gray-200 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CertificateVerifyPage;