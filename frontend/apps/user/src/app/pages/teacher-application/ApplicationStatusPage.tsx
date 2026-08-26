import { Alert, Button, Card, CardBody, CardHeader } from '@edumind/user-ui';
import { Clock, CheckCircle, XCircle, Calendar, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TEACHER_ROUTES, USER_ROUTES, formatDate } from '@edumind/shared-utils';
import { DocumentInfo, StatusHistoryResponse } from '@edumind/shared-types';
import { useTeacherApplicationStatus } from '../../hooks';

export function ApplicationStatusPage() {
  const navigate = useNavigate();

  const { application, isLoading: loading } = useTeacherApplicationStatus();

  const getStatusConfig = (status: string) => {
    const configs = {
      PENDING: {
        icon: Clock,
        color: 'yellow',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-500',
        title: 'Under Review',
        description: 'Your application is being reviewed by our team',
      },
      APPROVED: {
        icon: CheckCircle,
        color: 'green',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        iconColor: 'text-green-500',
        title: 'Approved',
        description: 'Congratulations! Your application has been approved',
      },
      REJECTED: {
        icon: XCircle,
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-500',
        title: 'Not Approved',
        description: 'Your application was not approved at this time',
      },
    };

    return configs[status as keyof typeof configs] || configs.PENDING;
  };



const getStatusStyle = (status?: string | null) => {
  const styles = {
    PENDING: {
      badge: 'bg-amber-50 text-amber-700 border border-amber-100',
      dot: 'bg-amber-500',
    },
    APPROVED: {
      badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      dot: 'bg-emerald-500',
    },
    REJECTED: {
      badge: 'bg-rose-50 text-rose-700 border border-rose-100',
      dot: 'bg-rose-500',
    },
    DEFAULT: {
      badge: 'bg-slate-50 text-slate-700 border border-slate-100',
      dot: 'bg-indigo-500',
    },
  };

  return styles[status as keyof typeof styles] || styles.DEFAULT;
};

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No application data found.</p>
          <Button variant="outline" onClick={() => navigate(USER_ROUTES.ROOT)}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(application.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Application Status
          </h1>
          <p className="text-lg text-gray-600">
            Track your teacher application progress
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardBody>
            <div className={`${statusConfig.bgColor} ${statusConfig.borderColor} border rounded-lg p-6`}>
              <div className="flex items-start">
                <StatusIcon className={`w-12 h-12 ${statusConfig.iconColor} mr-4 flex-shrink-0`} />
                <div className="flex-1">
                  <h2 className={`text-2xl font-bold ${statusConfig.textColor} mb-2`}>
                    {statusConfig.title}
                  </h2>
                  <p className={statusConfig.textColor}>
                    {statusConfig.description}
                  </p>

                  {/* Approval Type */}
                  {application.status === 'APPROVED' && application.approvalType && (
                    <div className="mt-4 flex items-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {application.approvalType === 'TRIAL' ? '🔄 Trial Account' : '✅ Full Access'}
                      </span>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {application.status === 'REJECTED' && application.rejectionReason && (
                    <div className="mt-4 p-4 bg-white rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Reason:</p>
                      <p className="text-sm text-gray-600">{application.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Trial Period Notice (if applicable) */}
        {application.status === 'APPROVED' && application.approvalType === 'TRIAL' && application.trialEndDate && (
          <Alert
            variant="warning"
            className="mb-6"
            title="Trial Period Active"
            message={`Your trial access expires on ${formatDate(application.trialEndDate)}. Complete your courses and maintain good ratings to upgrade to full access.`}
          />
        )}

        {/* Application Details */}
        <Card className="mb-6">
          <CardHeader>
            <h3 className="text-xl font-semibold">Application Details</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Applicant Name</p>
                <p className="font-medium text-gray-900">{application.firstName} {application.lastName}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-medium text-gray-900">{application.phone}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Submitted On</p>
                <p className="font-medium text-gray-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {formatDate(application.createdAt)}
                </p>
              </div>

              {application.reviewedAt && (
                <div>
                  <p className="text-sm text-gray-500">Reviewed On</p>
                  <p className="font-medium text-gray-900 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {formatDate(application.reviewedAt)}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500 mb-2">Teaching Subjects</p>
              <p className="text-gray-900">{application.subject}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Uploaded Documents</p>
              <div className="space-y-2">
                {(application.documents ?? []).map((document: DocumentInfo, index: number) => (
                  <a
                    key={index}
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Document {index + 1}
                  </a>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Status History */}
        {application.statusHistory && application.statusHistory.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Status History</h3>
                <p className="text-sm text-gray-500">Chronological trail of every status change</p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="relative">
                <div className="absolute left-4 top-3 bottom-3 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent" />
                <div className="space-y-5">
                  {application.statusHistory.map((history: StatusHistoryResponse, index: number) => {
                    const newStyle = getStatusStyle(history.newStatus);
                    const oldStyle = getStatusStyle(history.oldStatus);

                    return (
                      <div key={index} className="relative pl-12">
                        <span className={`absolute left-1.5 top-4 w-4 h-4 rounded-full border-4 border-white shadow ${newStyle.dot}`} />
                        <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              {history.oldStatus && (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-semibold ${oldStyle.badge}`}>
                                  {history.oldStatus}
                                </span>
                              )}
                              {history.oldStatus && history.newStatus && (
                                <span className="text-gray-400 font-semibold">→</span>
                              )}
                              {history.newStatus && (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-semibold ${newStyle.badge}`}>
                                  {history.newStatus}
                                </span>
                              )}
                            </div>
                            <span className="text-xs uppercase tracking-wide text-gray-500">
                              {formatDate(history.createdAt)}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                            <span className="font-medium text-gray-900">{history.changedByUsername}</span>
                            <span className="text-gray-300">•</span>
                            <span>{history.changedByEmail}</span>
                          </div>

                          {history.changeReason && (
                            <div className="mt-3 text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-3 leading-relaxed">
                              {history.changeReason}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center">
          {application.status === 'PENDING' && (
            <p className="text-center text-gray-600">
              We'll notify you via email once your application is reviewed
            </p>
          )}
          
          {application.status === 'APPROVED' && (
            <Button
              variant="primary"
              onClick={() => navigate(TEACHER_ROUTES.DASHBOARD)}
            >
              Go to Teacher Dashboard
            </Button>
          )}
          
          {application.status === 'REJECTED' && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                onClick={() => navigate(USER_ROUTES.TEACHER_APPLICATION)}
              >
                Apply Again
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(USER_ROUTES.ROOT)}
              >
                Back to Home
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApplicationStatusPage;