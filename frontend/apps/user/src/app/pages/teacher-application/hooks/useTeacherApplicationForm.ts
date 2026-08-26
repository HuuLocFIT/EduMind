import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  TeacherApplicationRequestSchema,
  type DocumentInfo,
  type DocumentType,
  type TeacherApplicationRequest,
} from "@edumind/shared-types";
import { type UploadedFile, useToast } from "@edumind/user-ui";
import { USER_ROUTES } from "@edumind/shared-utils";
import { teacherApplicationService } from "../../../services/teacher-application.service";
import { fileUploadService } from "../../../services/file-upload.service";
import { useTeacherApplicationStatus } from "../../../hooks";
import { useAuthStore } from "../../../stores/auth.store";
import { queryKeys } from "../../../lib/query-keys";
import {
  applicationSchema,
  type ApplicationFormData,
} from "../teacher-application.schema";

const FORM_FIELD_KEYS: (keyof ApplicationFormData)[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "subject",
  "experienceYears",
  "qualifications",
  "bio",
  "motivation",
];

export function useTeacherApplicationForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { success: showSuccess, error: showError } = useToast();
  const { application, isRejected } = useTeacherApplicationStatus();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [documentsError, setDocumentsError] = useState("");
  const [cvError, setCvError] = useState("");
  const [cvFiles, setCvFiles] = useState<UploadedFile[]>([]);
  const [certificateFiles, setCertificateFiles] = useState<UploadedFile[]>([]);
  const [degreeFiles, setDegreeFiles] = useState<UploadedFile[]>([]);
  const [idCardFiles, setIdCardFiles] = useState<UploadedFile[]>([]);
  const [retainedDocuments, setRetainedDocuments] = useState<DocumentInfo[]>(
    [],
  );
  const initializedApplicationId = useRef<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
  });

  const focusFirstError = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = formRef.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"], [data-error-focus="true"]',
        );
        if (!target) return;
        target.scrollIntoView?.({ behavior: "smooth", block: "center" });
        target.focus({ preventScroll: true });
      });
    });
  };

  useEffect(() => {
    if (!isRejected || !application) return;
    if (initializedApplicationId.current === application.id) return;

    form.reset({
      firstName: application.firstName ?? "",
      lastName: application.lastName ?? "",
      email: application.email ?? "",
      phone: application.phone ?? "",
      subject: application.subject ?? "",
      experienceYears: application.experienceYears ?? undefined,
      qualifications: application.qualifications ?? "",
      bio: application.bio ?? "",
      motivation: application.motivation ?? "",
    });
    setRetainedDocuments(application.documents ?? []);
    initializedApplicationId.current = application.id;
  }, [isRejected, application, form]);

  const uploadFiles = async (
    files: UploadedFile[],
    documentType: DocumentType,
    setFiles: Dispatch<SetStateAction<UploadedFile[]>>,
  ): Promise<Array<{ url: string; name: string; type: DocumentType }>> => {
    const existingResults = files
      .filter((item) => item.status === "success" && item.url)
      .map((item) => ({
        name: item.file.name,
        url: item.url as string,
        type: documentType,
      }));
    const pendingItems = files.filter((item) => item.status === "pending");

    if (pendingItems.length === 0) return existingResults;

    setFiles((previous) =>
      previous.map((item) =>
        pendingItems.some((pending) => pending.file === item.file)
          ? { ...item, status: "uploading" as const }
          : item,
      ),
    );

    const settled = await Promise.allSettled(
      pendingItems.map((item) => fileUploadService.uploadFile(item.file)),
    );
    const newResults = [...existingResults];
    let hasError = false;

    pendingItems.forEach((item, index) => {
      const result = settled[index];
      if (result.status === "fulfilled") {
        newResults.push({
          url: result.value.url,
          name: item.file.name,
          type: documentType,
        });
      } else {
        hasError = true;
      }
    });

    setFiles((previous) =>
      previous.map((item) => {
        const pendingIndex = pendingItems.findIndex(
          (pending) => pending.file === item.file,
        );
        if (pendingIndex === -1) return item;
        const result = settled[pendingIndex];
        return result.status === "fulfilled"
          ? { ...item, status: "success" as const, url: result.value.url }
          : { ...item, status: "error" as const, error: "Upload failed" };
      }),
    );

    if (hasError) throw new Error("Upload failed");
    return newResults;
  };

  const onSubmit = async (data: ApplicationFormData) => {
    setFormError("");
    setDocumentsError("");
    setCvError("");
    setIsSubmitting(true);

    try {
      const hasUsableCv =
        cvFiles.some((file) => file.status !== "error") ||
        retainedDocuments.some((document) => document.type === "CV");
      if (!hasUsableCv) {
        setCvError(
          "CV / Resume is required. If your previous application didn't have a separate CV, please upload one.",
        );
        focusFirstError();
        return;
      }

      const documents: DocumentInfo[] = [];
      if (cvFiles.length > 0)
        documents.push(...(await uploadFiles(cvFiles, "CV", setCvFiles)));
      if (certificateFiles.length > 0)
        documents.push(
          ...(await uploadFiles(
            certificateFiles,
            "CERTIFICATE",
            setCertificateFiles,
          )),
        );
      if (degreeFiles.length > 0)
        documents.push(
          ...(await uploadFiles(degreeFiles, "DEGREE", setDegreeFiles)),
        );
      if (idCardFiles.length > 0)
        documents.push(
          ...(await uploadFiles(idCardFiles, "ID_CARD", setIdCardFiles)),
        );

      const applicationData: TeacherApplicationRequest = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        experienceYears: data.experienceYears || null,
        qualifications: data.qualifications,
        documents: [...documents, ...retainedDocuments],
        bio: data.bio || null,
        motivation: data.motivation,
      };

      await teacherApplicationService.submitApplication(
        TeacherApplicationRequestSchema.parse(applicationData),
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.teacherApplication.myApplication(user?.id),
      });
      showSuccess("Application submitted successfully!");
      setTimeout(
        () =>
          navigate(USER_ROUTES.TEACHER_APPLICATION_STATUS, { replace: true }),
        1500,
      );
    } catch (caughtError: unknown) {
      const error = caughtError as {
        message?: string;
        fieldErrors?: Record<string, string>;
        response?: { data?: { message?: string } };
      };
      const errorMessage =
        error.message ||
        error.response?.data?.message ||
        "Failed to submit application";
      const unmatchedMessages: string[] = [];

      if (error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (FORM_FIELD_KEYS.includes(field as keyof ApplicationFormData)) {
            form.setError(field as keyof ApplicationFormData, {
              type: "server",
              message,
            });
          } else if (field === "documents" || field.startsWith("documents[")) {
            setDocumentsError(message);
          } else {
            unmatchedMessages.push(message);
          }
        }
      }

      if (!error.fieldErrors || unmatchedMessages.length > 0) {
        const fallbackMessage =
          unmatchedMessages.length > 0
            ? unmatchedMessages.join(" ")
            : errorMessage;
        if (errorMessage === "Upload failed")
          setDocumentsError(fallbackMessage);
        else setFormError(fallbackMessage);
      }
      focusFirstError();
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearDocumentsError = () => setDocumentsError("");

  return {
    form,
    formRef,
    isSubmitting,
    formError,
    documentsError,
    cvError,
    files: { cvFiles, certificateFiles, degreeFiles, idCardFiles },
    retainedDocuments,
    submit: form.handleSubmit(onSubmit, focusFirstError),
    cancel: () => navigate(USER_ROUTES.ROOT),
    fileActions: {
      setCvFiles: (files: UploadedFile[]) => {
        setCvFiles(files);
        setCvError("");
        clearDocumentsError();
      },
      setCertificateFiles: (files: UploadedFile[]) => {
        setCertificateFiles(files);
        clearDocumentsError();
      },
      setDegreeFiles: (files: UploadedFile[]) => {
        setDegreeFiles(files);
        clearDocumentsError();
      },
      setIdCardFiles: (files: UploadedFile[]) => {
        setIdCardFiles(files);
        clearDocumentsError();
      },
      removeRetainedDocument: (index: number) => {
        setRetainedDocuments((previous) =>
          previous.filter((_, itemIndex) => itemIndex !== index),
        );
        clearDocumentsError();
      },
    },
  };
}
