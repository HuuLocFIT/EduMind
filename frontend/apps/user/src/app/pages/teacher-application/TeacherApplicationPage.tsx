import { Send } from "lucide-react";
import { Button, Card, CardBody, CardHeader } from "@edumind/user-ui";
import { PersonalInformationSection } from "./components/PersonalInformationSection";
import { ProfessionalBackgroundSection } from "./components/ProfessionalBackgroundSection";
import { MotivationSection } from "./components/MotivationSection";
import { DocumentsSection } from "./components/DocumentsSection";
import { useTeacherApplicationForm } from "./hooks/useTeacherApplicationForm";

export function TeacherApplicationPage() {
  const {
    form,
    formRef,
    isSubmitting,
    formError,
    documentsError,
    cvError,
    files,
    retainedDocuments,
    submit,
    cancel,
    fileActions,
  } = useTeacherApplicationForm();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Become a Teacher on EduMind
          </h1>
          <p className="text-lg text-gray-600">
            Share your knowledge and inspire students worldwide
          </p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold text-gray-800">
              Teacher Application Form
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Fill out the form below to apply as a teacher
            </p>
          </CardHeader>
          <CardBody>
            <form ref={formRef} onSubmit={submit} className="space-y-6">
              <PersonalInformationSection
                register={form.register}
                errors={form.formState.errors}
              />
              <ProfessionalBackgroundSection
                register={form.register}
                errors={form.formState.errors}
              />
              <MotivationSection
                register={form.register}
                errors={form.formState.errors}
              />
              <DocumentsSection
                {...files}
                retainedDocuments={retainedDocuments}
                cvError={cvError}
                documentsError={documentsError}
                onCvFilesChange={fileActions.setCvFiles}
                onCertificateFilesChange={fileActions.setCertificateFiles}
                onDegreeFilesChange={fileActions.setDegreeFiles}
                onIdCardFilesChange={fileActions.setIdCardFiles}
                onRemoveRetainedDocument={fileActions.removeRetainedDocument}
              />

              <div className="pt-6 border-t border-gray-200">
                {formError && (
                  <p
                    role="alert"
                    tabIndex={-1}
                    data-error-focus="true"
                    className="mb-4 text-sm text-red-600 text-right"
                  >
                    {formError}
                  </p>
                )}
                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancel}
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
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                  </Button>
                </div>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> After submitting your application, our team
            will review it within 2-3 business days. You'll receive an email
            notification once your application is processed.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TeacherApplicationPage;
