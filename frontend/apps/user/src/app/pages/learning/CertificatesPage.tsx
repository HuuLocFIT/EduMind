import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, Loading } from '@edumind/user-ui';
import { enrollmentService } from '../../services/enrollment.service';
import type { EnrollmentResponse } from '@edumind/shared-types';
import { Award } from 'lucide-react';
import { CertificateCard } from '../../components/course-module/CertificateCard';
import { useAuthStore } from '../../stores/auth.store';
import { queryKeys } from '../../lib/query-keys';
import { STALE_TIME_ENROLLMENTS } from '../../lib/query-config';
import { USER_ROUTES } from '@edumind/shared-utils';
import { useNavigate } from 'react-router-dom';

export const CertificatesPage: React.FC = () => {
  const { user } = useAuthStore();
  const userId = user?.id;

  const navigate = useNavigate();

  // Use React Query for caching and better performance
  const { data: enrollments = [], isLoading: loading } = useQuery<EnrollmentResponse[]>({
    queryKey: queryKeys.enrollments.me(userId),
    queryFn: async () => {
      const response = await enrollmentService.getMyEnrollments({ page: 0, size: 100 });
      return response.data || [];
    },
    staleTime: STALE_TIME_ENROLLMENTS,
    enabled: Boolean(userId),
  });

  // Filter only completed courses
  const certificates = useMemo(() => {
    return enrollments.filter((e: EnrollmentResponse) => e.status === 'COMPLETED');
  }, [enrollments]);

  const handleDownload = (enrollment: EnrollmentResponse) => {
    // Lucas: Implement certificate download
    alert(`Download certificate for ${enrollment.courseTitle}`);
  };

  const handleShare = (enrollment: EnrollmentResponse) => {
    // Lucas: Implement certificate sharing (LinkedIn, etc.)
    alert(`Share certificate for ${enrollment.courseTitle}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">My Certificates</h1>
              <p className="text-blue-100 text-lg">
                {certificates.length} {certificates.length === 1 ? 'certificate' : 'certificates'} earned
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Empty State */}
        {certificates.length === 0 ? (
          <Card className="p-12 text-center">
            <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No certificates yet
            </h3>
            <p className="text-gray-600 mb-6">
              Complete courses to earn certificates and showcase your achievements
            </p>
            <Button
              variant="primary"
              onClick={() => navigate(USER_ROUTES.LEARNING)}
            >
              View My Learning 
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((enrollment) => (
              <CertificateCard
                key={enrollment.id}
                enrollment={enrollment}
                onDownload={() => handleDownload(enrollment)}
                onShare={() => handleShare(enrollment)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificatesPage;