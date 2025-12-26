import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  TeacherApplicationRequestSchema,
  type TeacherApplicationRequest,
  type DocumentType,
} from '@edumind/shared-types';
import { User, Phone, GraduationCap, Briefcase, BookOpen, Send, Mail } from 'lucide-react';

import {
  Button,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardBody,
  Alert,
  useToast,
} from '@edumind/user-ui';

import { FileUpload, UploadedFile } from '@edumind/user-ui';
import { teacherApplicationService } from '../../services/teacher-application.service';
import { fileUploadService } from '../../services/file-upload.service'; 
import { USER_ROUTES } from '@edumind/shared-utils';

// Form schema matching TeacherApplicationRequest
const applicationSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters'),
  email: z
    .string()
    .trim()
    .email('Email should be valid')
    .min(1, 'Email is required'),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format')
    .optional()
    .nullable(),
  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .max(200, 'Subject must not exceed 200 characters'),
  experienceYears: z
    .number()
    .int('Experience years must be an integer')
    .min(0, 'Experience years must be positive')
    .optional()
    .nullable(),
  qualifications: z
    .string()
    .trim()
    .min(1, 'Qualifications are required'),
  bio: z
    .string()
    .trim()
    .max(2000, 'Bio must not exceed 2000 characters')
    .optional()
    .nullable(),
  motivation: z
    .string()
    .trim()
    .min(1, 'Motivation is required')
    .max(1000, 'Motivation must not exceed 1000 characters'),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export function TeacherApplicationPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const { success: showSuccess, error: showError, info: showInfo } = useToast();
  
  const [cvFiles, setCvFiles] = useState<UploadedFile[]>([]);
  const [certificateFiles, setCertificateFiles] = useState<UploadedFile[]>([]);
  const [degreeFiles, setDegreeFiles] = useState<UploadedFile[]>([]);
  const [idCardFiles, setIdCardFiles] = useState<UploadedFile[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
  });

  // Check if user already has an application
  useEffect(() => {
    checkExistingApplication();
  }, []);

  const checkExistingApplication = async () => {
    try {
      setIsChecking(true);
      const application = await teacherApplicationService.getMyApplication();
      if (application) {
        showInfo('You already have an application. Redirecting...');
        setTimeout(() => navigate(USER_ROUTES.TEACHER_APPLICATION_STATUS), 2000);
      }
    } catch (error: any) {
      // User doesn't have application yet, can proceed
      console.log('No existing application');
    } finally {
      setIsChecking(false);
    }
  };

  const uploadFiles = async (
    files: UploadedFile[],
    documentType: DocumentType
  ): Promise<Array<{ url: string; name: string; type: DocumentType }>> => {
    const validFiles = files.filter(f => f.status !== 'error').map(f => f.file);
    
    if (validFiles.length === 0) return [];

    // Update status to uploading
    files.forEach(f => f.status = 'uploading');
    setCvFiles([...cvFiles]);
    setCertificateFiles([...certificateFiles]);
    setDegreeFiles([...degreeFiles]);
    setIdCardFiles([...idCardFiles]);

    try {
      const uploadResults = await fileUploadService.uploadMultipleFiles(validFiles);
      
      // Update status to success
      files.forEach((f, index) => {
        f.status = 'success';
        f.url = uploadResults[index].url;
      });
      
      return uploadResults.map((r, index) => ({
        url: r.url,
        name: validFiles[index].name,
        type: documentType,
      }));
    } catch (error) {
      // Update status to error
      files.forEach(f => {
        f.status = 'error';
        f.error = 'Upload failed';
      });
      throw error;
    }
  };

  const onSubmit = async (data: ApplicationFormData) => {
    setError('');
    setIsSubmitting(true);

    try {
      // Validate at least one document is uploaded
      const totalFiles = cvFiles.length + certificateFiles.length + degreeFiles.length + idCardFiles.length;
      if (totalFiles === 0) {
        setError('Please upload at least one document');
        setIsSubmitting(false);
        return;
      }

      // Upload all documents with their types
      const documentInfos: Array<{ url: string; name: string; type: DocumentType }> = [];

      // Upload CV/Resume (ID_CARD type for identification)
      if (cvFiles.length > 0) {
        const cvDocs = await uploadFiles(cvFiles, 'ID_CARD');
        documentInfos.push(...cvDocs);
      }

      // Upload Certificates
      if (certificateFiles.length > 0) {
        const certDocs = await uploadFiles(certificateFiles, 'CERTIFICATE');
        documentInfos.push(...certDocs);
      }

      // Upload Degrees
      if (degreeFiles.length > 0) {
        const degreeDocs = await uploadFiles(degreeFiles, 'DEGREE');
        documentInfos.push(...degreeDocs);
      }

      // Upload ID Cards
      if (idCardFiles.length > 0) {
        const idDocs = await uploadFiles(idCardFiles, 'ID_CARD');
        documentInfos.push(...idDocs);
      }

      // Prepare application data
      const applicationData: TeacherApplicationRequest = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        experienceYears: data.experienceYears || null,
        qualifications: data.qualifications,
        documents: documentInfos,
        bio: data.bio || null,
        motivation: data.motivation,
      };

      // Validate with schema
      const validatedData = TeacherApplicationRequestSchema.parse(applicationData);

      // Submit application
      await teacherApplicationService.submitApplication(validatedData);

      showSuccess('Application submitted successfully!');
      
      // Redirect to status page
      setTimeout(() => {
        navigate(USER_ROUTES.TEACHER_APPLICATION_STATUS);
      }, 1500);

    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Failed to submit application';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking application status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Become a Teacher on EduMind
          </h1>
          <p className="text-lg text-gray-600">
            Share your knowledge and inspire students worldwide
          </p>
        </div>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold text-gray-800">Teacher Application Form</h2>
            <p className="text-sm text-gray-600 mt-1">
              Fill out the form below to apply as a teacher
            </p>
          </CardHeader>

          <CardBody>
            {error && (
              <Alert variant="error" message={error} className="mb-6" onClose={() => setError('')} />
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    placeholder="Lucas"
                    leftIcon={<User className="w-5 h-5" />}
                    error={errors.firstName?.message}
                    fullWidth
                    required
                    {...register('firstName')}
                  />

                  <Input
                    label="Last Name"
                    placeholder="Nguyen"
                    leftIcon={<User className="w-5 h-5" />}
                    error={errors.lastName?.message}
                    fullWidth
                    required
                    {...register('lastName')}
                  />
                </div>

                <Input
                  label="Email"
                  type="email"
                  placeholder="lucas.nguyen@example.com"
                  leftIcon={<Mail className="w-5 h-5" />}
                  error={errors.email?.message}
                  fullWidth
                  required
                  {...register('email')}
                />

                <Input
                  label="Phone Number"
                  placeholder="0912 345 678"
                  leftIcon={<Phone className="w-5 h-5" />}
                  error={errors.phone?.message}
                  fullWidth
                  {...register('phone')}
                />
              </div>

              {/* Professional Background */}
              <div className="space-y-4 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <GraduationCap className="w-5 h-5 mr-2" />
                  Professional Background
                </h3>

                <Input
                  label="Subject You Can Teach"
                  placeholder="Web Development, JavaScript, React..."
                  leftIcon={<BookOpen className="w-5 h-5" />}
                  error={errors.subject?.message}
                  helperText="List the main subject or subjects you can teach"
                  fullWidth
                  {...register('subject')}
                  required
                />

                <Input
                  label="Years of Experience"
                  type="number"
                  placeholder="5"
                  leftIcon={<Briefcase className="w-5 h-5" />}
                  error={errors.experienceYears?.message}
                  helperText="Number of years of teaching experience"
                  fullWidth
                  {...register('experienceYears', { valueAsNumber: true })}
                />

                <Textarea
                  label="Qualifications"
                  placeholder="Bachelor's in Computer Science from XYZ University, Teaching Certificate..."
                  rows={4}
                  error={errors.qualifications?.message}
                  helperText="Include degrees, certifications, and relevant qualifications"
                  fullWidth
                  {...register('qualifications')} 
                  required
                />

                <Textarea
                  label="Bio (Optional)"
                  placeholder="Brief introduction about yourself..."
                  rows={3}
                  error={errors.bio?.message}
                  helperText="Tell us about yourself (max 2000 characters)"
                  fullWidth
                  {...register('bio')}
                />
              </div>

              {/* Motivation */}
              <div className="space-y-4 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Motivation
                </h3>

                <Textarea
                  label="Why Do You Want to Teach?"
                  placeholder="I'm passionate about helping students learn..."
                  rows={4}
                  error={errors.motivation?.message}
                  helperText="Share your passion and goals as an educator (max 1000 characters)"
                  fullWidth
                  {...register('motivation')}
                  required
                />
              </div>

              {/* Document Uploads */}
              <div className="space-y-6 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2" />
                  Required Documents
                </h3>
                <p className="text-sm text-gray-600">
                  Please upload at least one document. All documents should be clear and readable.
                </p>

                <FileUpload
                  label="CV / Resume"
                  accept=".pdf,.doc,.docx"
                  multiple={false}
                  maxSize={5}
                  maxFiles={1}
                  onFilesChange={setCvFiles}
                  helperText="Upload your CV or Resume (PDF, DOC, DOCX - Max 5MB)"
                  required
                />

                <FileUpload
                  label="Certificates (Optional)"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple={true}
                  maxSize={5}
                  maxFiles={5}
                  onFilesChange={setCertificateFiles}
                  helperText="Upload teaching certificates or credentials (Max 5 files, 5MB each)"
                />

                <FileUpload
                  label="Degrees / Diplomas (Optional)"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple={true}
                  maxSize={5}
                  maxFiles={5}
                  onFilesChange={setDegreeFiles}
                  helperText="Upload your educational degrees or diplomas (Max 5 files, 5MB each)"
                />

                <FileUpload
                  label="ID Card / Identification (Optional)"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple={false}
                  maxSize={5}
                  maxFiles={1}
                  onFilesChange={setIdCardFiles}
                  helperText="Upload your ID card or identification document (Max 5MB)"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(USER_ROUTES.ROOT)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  leftIcon={<Send className="w-5 h-5" />}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Info Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> After submitting your application, our team will review it within 2-3 business days. 
            You'll receive an email notification once your application is processed.
          </p>
        </div>
      </div>
    </div>
  );
}
