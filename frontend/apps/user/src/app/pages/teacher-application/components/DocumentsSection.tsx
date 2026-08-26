import { Briefcase, X } from "lucide-react";
import { FileUpload, type UploadedFile } from "@edumind/user-ui";
import type { DocumentInfo } from "@edumind/shared-types";

interface DocumentsSectionProps {
  cvFiles: UploadedFile[];
  certificateFiles: UploadedFile[];
  degreeFiles: UploadedFile[];
  idCardFiles: UploadedFile[];
  retainedDocuments: DocumentInfo[];
  cvError: string;
  documentsError: string;
  onCvFilesChange: (files: UploadedFile[]) => void;
  onCertificateFilesChange: (files: UploadedFile[]) => void;
  onDegreeFilesChange: (files: UploadedFile[]) => void;
  onIdCardFilesChange: (files: UploadedFile[]) => void;
  onRemoveRetainedDocument: (index: number) => void;
}

export function DocumentsSection({
  cvFiles,
  certificateFiles,
  degreeFiles,
  idCardFiles,
  retainedDocuments,
  cvError,
  documentsError,
  onCvFilesChange,
  onCertificateFilesChange,
  onDegreeFilesChange,
  onIdCardFilesChange,
  onRemoveRetainedDocument,
}: DocumentsSectionProps) {
  return (
    <div
      className={`space-y-6 border-t pt-6 ${documentsError || cvError ? "border-red-500" : "border-gray-200"}`}
      aria-invalid={!!(documentsError || cvError)}
      aria-describedby={
        documentsError ? "teacher-application-documents-error" : undefined
      }
      tabIndex={-1}
    >
      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
        <Briefcase className="w-5 h-5 mr-2" />
        Required Documents
      </h3>
      <p className="text-sm text-gray-600">
        Please upload at least one document. All documents should be clear and
        readable.
      </p>
      <p className="text-sm text-gray-600">
        Only PDF and DOCX files are accepted. If you have a photo of a document
        (e.g. your ID card or a certificate), please convert it to PDF before
        uploading.
      </p>
      {documentsError && (
        <p
          id="teacher-application-documents-error"
          role="alert"
          className="text-sm text-red-600"
        >
          {documentsError}
        </p>
      )}

      {retainedDocuments.length > 0 && (
        <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-800">
            Previously submitted documents
          </h4>
          <p className="text-sm text-gray-600">
            These documents were submitted with your previous application and
            will be kept unless you remove them. Removing one means you'll need
            to upload a replacement file below.
          </p>
          <ul className="space-y-2">
            {retainedDocuments.map((doc, index) => (
              <li
                key={`${doc.url}-${index}`}
                className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-md px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium uppercase tracking-wide bg-blue-100 text-blue-800 rounded px-2 py-0.5">
                    {doc.type}
                  </span>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-700 hover:underline truncate"
                  >
                    {doc.name}
                  </a>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${doc.name}`}
                  onClick={() => onRemoveRetainedDocument(index)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FileUpload
        label="CV / Resume *"
        accept=".pdf,.docx"
        multiple={false}
        maxSize={5}
        maxFiles={1}
        files={cvFiles}
        onFilesChange={onCvFilesChange}
        error={cvError}
        helperText="Upload your CV or Resume (PDF, DOCX - Max 5MB)"
      />
      <FileUpload
        label="Certificates (Optional)"
        accept=".pdf,.docx"
        multiple
        maxSize={5}
        maxFiles={5}
        files={certificateFiles}
        onFilesChange={onCertificateFilesChange}
        helperText="Upload teaching certificates or credentials (PDF, DOCX - Max 5 files, 5MB each)"
      />
      <FileUpload
        label="Degrees / Diplomas (Optional)"
        accept=".pdf,.docx"
        multiple
        maxSize={5}
        maxFiles={5}
        files={degreeFiles}
        onFilesChange={onDegreeFilesChange}
        helperText="Upload your educational degrees or diplomas (PDF, DOCX - Max 5 files, 5MB each)"
      />
      <FileUpload
        label="ID Card / Identification (Optional)"
        accept=".pdf,.docx"
        multiple={false}
        maxSize={5}
        maxFiles={1}
        files={idCardFiles}
        onFilesChange={onIdCardFilesChange}
        helperText="Upload your ID card or identification document (PDF, DOCX - Max 5MB)"
      />
    </div>
  );
}
