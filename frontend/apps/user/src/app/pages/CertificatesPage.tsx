import React, { useState, useEffect } from 'react';
import { Card, Button, Loading } from '@edumind/user-ui';
import { enrollmentService } from '@user/services/index';
import type { EnrollmentResponse } from '@edumind/shared-types';
import { Award } from 'lucide-react';
import { CertificateCard } from '../components/course-module/CertificateCard';

export const CertificatesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<EnrollmentResponse[]>([]);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    setLoading(true);

    try {
      const response = await enrollmentService.getMyEnrollments({ page: 0, size: 100 });
      const enrollments = response.data || [];
      
      // Filter only completed courses
      const completed = enrollments.filter(
        (e: EnrollmentResponse) => e.status === 'COMPLETED'
      );
      setCertificates(completed);
    } catch (err) {
      console.error('Error fetching certificates:', err);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Certificates</h1>
              <p className="text-gray-600 mt-1">
                {certificates.length} certificate{certificates.length !== 1 ? 's' : ''} earned
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
              onClick={() => window.location.href = '/my-learning'}
            >
              View My Courses
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