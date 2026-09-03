import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockSubmitApplication,
  mockUploadFile,
  mockNavigate,
  mockToastSuccess,
  mockToastError,
  mockUseTeacherApplicationStatus,
} = vi.hoisted(() => ({
  mockSubmitApplication: vi.fn(),
  mockUploadFile: vi.fn(),
  mockNavigate: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockUseTeacherApplicationStatus: vi.fn(),
}));

vi.mock('../../services/teacher-application.service', () => ({
  teacherApplicationService: {
    submitApplication: mockSubmitApplication,
  },
}));

vi.mock('../../services/file-upload.service', () => ({
  fileUploadService: {
    uploadFile: mockUploadFile,
  },
}));

vi.mock('../../hooks', () => ({
  useTeacherApplicationStatus: mockUseTeacherApplicationStatus,
}));

vi.mock('../../stores/auth.store', () => ({
  useAuthStore: () => ({ user: { id: 1 } }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Captures the `onFilesChange` callback (== the real setState setter from the
// page) for each bucket, keyed by label, so tests can drive controlled state
// directly the way the real FileUpload's internal handlers would.
const fileUploadCallbacks: Record<string, (files: any[]) => void> = {};

vi.mock('@edumind/user-ui', async () => {
  return {
    Button: ({ children, type, onClick, disabled, isLoading }: any) => (
      <button type={type || 'button'} onClick={onClick} disabled={disabled || isLoading}>
        {children}
      </button>
    ),
    Input: ({ label, error, leftIcon, fullWidth, helperText, ...rest }: any) => (
      <label>
        {label}
        <input aria-label={label} aria-invalid={!!error} {...rest} />
        {error && <span>{error}</span>}
      </label>
    ),
    Textarea: ({ label, error, fullWidth, helperText, ...rest }: any) => (
      <label>
        {label}
        <textarea aria-label={label} aria-invalid={!!error} {...rest} />
        {error && <span>{error}</span>}
      </label>
    ),
    Card: ({ children }: any) => <div>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardBody: ({ children }: any) => <div>{children}</div>,
    Alert: ({ message, onClose }: any) => (
      <div role="alert">
        {message}
        {onClose && <button onClick={onClose}>dismiss</button>}
      </div>
    ),
    useToast: () => ({ success: mockToastSuccess, error: mockToastError }),
    FileUpload: ({ label, required, accept, helperText, error, files, onFilesChange }: any) => {
      const displayedLabel = `${label}${required ? ' *' : ''}`;
      fileUploadCallbacks[displayedLabel] = onFilesChange;
      return (
        <div>
          <span data-testid={`accept-${displayedLabel}`}>{accept}</span>
          <span data-testid={`helper-${displayedLabel}`}>{helperText}</span>
          <span data-testid={`required-${displayedLabel}`}>{String(!!required)}</span>
          {error && <span>{error}</span>}
          <pre data-testid={`files-${displayedLabel}`}>
            {JSON.stringify(
              (files ?? []).map((f: any) => ({
                name: f.file.name,
                status: f.status,
                url: f.url,
                error: f.error,
              }))
            )}
          </pre>
        </div>
      );
    },
  };
});

// Explicit list (not a catch-all Proxy) so Vitest's named-export check on the
// mock passes; a Proxy also risks turning the module into an accidental
// thenable if a `then` property lookup ever returns a non-undefined value,
// which Vite/Vitest would `await` indefinitely while resolving `vi.mock`.
vi.mock('lucide-react', () => {
  const Icon = () => <span />;
  return {
    User: Icon,
    Phone: Icon,
    GraduationCap: Icon,
    Briefcase: Icon,
    BookOpen: Icon,
    Send: Icon,
    Mail: Icon,
    X: Icon,
  };
});

import { TeacherApplicationPage } from './TeacherApplicationPage';

const CV_LABEL = 'CV / Resume *';
const CERT_LABEL = 'Certificates (Optional)';
const DEGREE_LABEL = 'Degrees / Diplomas (Optional)';
const ID_LABEL = 'ID Card / Identification (Optional)';

const makeFile = (
  name: string,
  status: 'pending' | 'uploading' | 'success' | 'error',
  url?: string,
  error?: string
) => ({
  file: new File(['content'], name, { type: 'application/pdf' }),
  status,
  url,
  error,
});

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <TeacherApplicationPage />
    </QueryClientProvider>
  );
  return { ...utils, queryClient };
};

const makeApplication = (overrides: Record<string, any> = {}) => ({
  id: 1,
  userId: 1,
  username: 'jane.doe',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  phone: '0912345678',
  subject: 'Mathematics',
  experienceYears: 5,
  qualifications: 'BSc Mathematics',
  documents: [],
  bio: 'A passionate educator.',
  motivation: 'I love teaching.',
  status: 'REJECTED',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const fillRequiredTextFields = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('First Name'), 'Jane');
  await user.type(screen.getByLabelText('Last Name'), 'Doe');
  await user.type(screen.getByLabelText('Email'), 'jane.doe@example.com');
  await user.type(screen.getByLabelText('Subject You Can Teach'), 'Mathematics');
  await user.type(screen.getByLabelText('Qualifications'), 'BSc Mathematics');
  await user.type(screen.getByLabelText('Why Do You Want to Teach?'), 'I love teaching.');
  return user;
};

const setBucket = (label: string, files: any[]) => {
  act(() => {
    fileUploadCallbacks[label](files);
  });
};

const getBucketState = (label: string) => {
  const raw = screen.getByTestId(`files-${label}`).textContent ?? '[]';
  return JSON.parse(raw);
};

const submit = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /submit application/i }));
};

describe('TeacherApplicationPage', () => {
  beforeEach(() => {
    for (const key of Object.keys(fileUploadCallbacks)) delete fileUploadCallbacks[key];
    mockSubmitApplication.mockReset();
    mockUploadFile.mockReset();
    mockNavigate.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockSubmitApplication.mockResolvedValue({ message: 'ok' });
    mockUseTeacherApplicationStatus.mockReset();
    mockUseTeacherApplicationStatus.mockReturnValue({
      application: null,
      isRejected: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Task A -----------------------------------------------------------------
  it('only accepts PDF and DOCX for all four document uploads', () => {
    renderPage();

    for (const label of [CV_LABEL, CERT_LABEL, DEGREE_LABEL, ID_LABEL]) {
      const accept = screen.getByTestId(`accept-${label}`).textContent ?? '';
      expect(accept).not.toMatch(/jpg/i);
      expect(accept).not.toMatch(/png/i);
      expect(accept).not.toMatch(/\.doc,/i);
      expect(accept).toBe('.pdf,.docx');
    }
  });

  it('marks the CV upload as required', () => {
    renderPage();

    expect(screen.getByTestId(`required-${CV_LABEL}`)).toHaveTextContent('true');
  });

  it('shows the CV error together with text-field errors on the first invalid submit', async () => {
    renderPage();
    const user = userEvent.setup();

    await submit(user);

    expect(await screen.findByText('Motivation is required')).toBeInTheDocument();
    expect(screen.getByText(/CV \/ Resume is required/i)).toBeInTheDocument();
  });

  // B-1 / B-2 ---------------------------------------------------------------
  it('blocks submit with a clear error when CV is missing, without calling upload or submit APIs, and does not hit the native-required focus bug', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderPage();
    const user = await fillRequiredTextFields();

    await submit(user);

    expect(
      await screen.findByText(/CV \/ Resume is required/i)
    ).toBeInTheDocument();
    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(mockSubmitApplication).not.toHaveBeenCalled();
    const documentsSection = screen.getByText('Required Documents').closest('[aria-invalid="true"]');
    await waitFor(() => expect(documentsSection).toHaveFocus());

    const focusableBugLogged = consoleErrorSpy.mock.calls.some(call =>
      call.some(arg => typeof arg === 'string' && arg.includes('not focusable'))
    );
    expect(focusableBugLogged).toBe(false);
  });

  it('blocks submit when the CV bucket only contains an errored file (does not fall through to schema validation)', async () => {
    renderPage();
    const user = await fillRequiredTextFields();
    setBucket(CV_LABEL, [makeFile('cv.pdf', 'error', undefined, 'Upload failed')]);

    await submit(user);

    expect(await screen.findByText(/CV \/ Resume is required/i)).toBeInTheDocument();
    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(mockSubmitApplication).not.toHaveBeenCalled();
  });

  // Happy path + Task C fix --------------------------------------------------
  it('uploads a pending CV and submits the application, tagging the document as CV (not ID_CARD)', async () => {
    mockUploadFile.mockResolvedValue({
      publicId: 'p1',
      url: 'https://cdn.example.com/cv.pdf',
      fileName: 'cv.pdf',
      size: 100,
    });

    renderPage();
    const user = await fillRequiredTextFields();
    setBucket(CV_LABEL, [makeFile('cv.pdf', 'pending')]);

    await submit(user);

    await waitFor(() => expect(mockSubmitApplication).toHaveBeenCalledTimes(1));
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'cv.pdf' }),
      'documents/teacher-applications',
    );

    const payload = mockSubmitApplication.mock.calls[0][0];
    expect(payload.documents).toEqual([
      { url: 'https://cdn.example.com/cv.pdf', name: 'cv.pdf', type: 'CV' },
    ]);
  });

  it('shows backend field validation inline without restoring the top-of-form alert', async () => {
    mockSubmitApplication.mockRejectedValue({
      message: 'Validation failed for one or more fields',
      status: 400,
      timestamp: '2026-08-26T00:00:00',
      fieldErrors: { firstName: 'First name was rejected by the server' },
    });

    renderPage();
    const user = await fillRequiredTextFields();
    setBucket(CV_LABEL, [
      makeFile('cv.pdf', 'success', 'https://cdn.example.com/cv.pdf'),
    ]);

    await submit(user);

    expect(await screen.findByText('First name was rejected by the server')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('First Name')).toHaveFocus());
    expect(screen.queryByText('Validation failed for one or more fields')).not.toBeInTheDocument();
  });

  it('shows document validation in the documents section instead of below the form title', async () => {
    mockSubmitApplication.mockRejectedValue({
      message: 'Validation failed for one or more fields',
      status: 400,
      timestamp: '2026-08-26T00:00:00',
      fieldErrors: { documents: 'At least one valid document is required' },
    });

    renderPage();
    const user = await fillRequiredTextFields();
    setBucket(CV_LABEL, [
      makeFile('cv.pdf', 'success', 'https://cdn.example.com/cv.pdf'),
    ]);

    await submit(user);

    const error = await screen.findByText('At least one valid document is required');
    expect(error).toHaveAttribute('role', 'alert');
    expect(error).toHaveAttribute('id', 'teacher-application-documents-error');
    expect(screen.queryByText('Validation failed for one or more fields')).not.toBeInTheDocument();
  });

  // Index-mismatch regression -------------------------------------------------
  it('does not crash with a mixed error+pending CV bucket; the pending file gets its URL and the error file keeps its status', async () => {
    mockUploadFile.mockResolvedValue({
      publicId: 'p1',
      url: 'https://cdn.example.com/good.pdf',
      fileName: 'good.pdf',
      size: 100,
    });

    renderPage();
    const user = await fillRequiredTextFields();
    setBucket(CV_LABEL, [
      makeFile('bad.pdf', 'error', undefined, 'Upload failed'),
      makeFile('good.pdf', 'pending'),
    ]);

    await submit(user);

    await waitFor(() => expect(mockSubmitApplication).toHaveBeenCalledTimes(1));
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'good.pdf' }),
      'documents/teacher-applications',
    );

    const state = getBucketState(CV_LABEL);
    const bad = state.find((f: any) => f.name === 'bad.pdf');
    const good = state.find((f: any) => f.name === 'good.pdf');
    expect(bad.status).toBe('error');
    expect(good.status).toBe('success');
    expect(good.url).toBe('https://cdn.example.com/good.pdf');

    const payload = mockSubmitApplication.mock.calls[0][0];
    expect(payload.documents).toEqual([
      { url: 'https://cdn.example.com/good.pdf', name: 'good.pdf', type: 'CV' },
    ]);
  });

  // Duplicate-upload-on-retry regression --------------------------------------
  it('does not re-upload an already-succeeded CV bucket on a second submit after a different bucket failed', async () => {
    mockUploadFile.mockImplementation((file: File) => {
      if (file.name === 'cv.pdf') {
        return Promise.resolve({
          publicId: 'cv1',
          url: 'https://cdn.example.com/cv.pdf',
          fileName: 'cv.pdf',
          size: 100,
        });
      }
      return Promise.reject(new Error('network error'));
    });

    renderPage();
    const user = await fillRequiredTextFields();
    setBucket(CV_LABEL, [makeFile('cv.pdf', 'pending')]);
    setBucket(CERT_LABEL, [makeFile('cert.pdf', 'pending')]);

    // First submit: CV succeeds, Certificate fails -> submit aborted.
    await submit(user);
    await waitFor(() => expect(mockUploadFile).toHaveBeenCalledTimes(2));
    expect(mockSubmitApplication).not.toHaveBeenCalled();

    const cvAfterFirst = getBucketState(CV_LABEL);
    expect(cvAfterFirst[0].status).toBe('success');
    expect(cvAfterFirst[0].url).toBe('https://cdn.example.com/cv.pdf');

    // Second submit: CV must not be uploaded again; only the CV document
    // (still pointing at the original URL) reaches the final payload, no
    // duplicate document is created for the still-errored certificate.
    await submit(user);
    await waitFor(() => expect(mockSubmitApplication).toHaveBeenCalledTimes(1));
    // No 3rd call to uploadFile for cv.pdf.
    expect(mockUploadFile).toHaveBeenCalledTimes(2);

    const payload = mockSubmitApplication.mock.calls[0][0];
    expect(payload.documents).toEqual([
      { url: 'https://cdn.example.com/cv.pdf', name: 'cv.pdf', type: 'CV' },
    ]);
  });

  // 4-setter regression: bucket isolation -------------------------------------
  it('uploading the Certificate bucket does not alter the CV bucket state', async () => {
    mockUploadFile.mockImplementation((file: File) =>
      Promise.resolve({
        publicId: file.name,
        url: `https://cdn.example.com/${file.name}`,
        fileName: file.name,
        size: 100,
      })
    );

    renderPage();
    const user = await fillRequiredTextFields();
    setBucket(CV_LABEL, [makeFile('cv.pdf', 'success', 'https://cdn.example.com/cv.pdf')]);
    setBucket(CERT_LABEL, [makeFile('cert.pdf', 'pending')]);

    await submit(user);
    await waitFor(() => expect(mockSubmitApplication).toHaveBeenCalledTimes(1));

    // CV bucket must be untouched: still exactly the pre-existing success file.
    const cvState = getBucketState(CV_LABEL);
    expect(cvState).toEqual([
      { name: 'cv.pdf', status: 'success', url: 'https://cdn.example.com/cv.pdf' },
    ]);

    // Degree / ID buckets, never populated, must remain empty (no leaked data).
    expect(getBucketState(DEGREE_LABEL)).toEqual([]);
    expect(getBucketState(ID_LABEL)).toEqual([]);

    // The CV file must not have been re-uploaded because of the Certificate upload.
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'cert.pdf' }),
      'documents/teacher-applications',
    );
  });

  // Promise.allSettled partial-failure regression ------------------------------
  it('handles 2 successes + 1 failure within the same bucket: statuses are set correctly, uploadFiles throws, and a retry does not re-upload the succeeded files', async () => {
    mockUploadFile.mockImplementation((file: File) => {
      if (file.name === 'cert-fail.pdf') {
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve({
        publicId: file.name,
        url: `https://cdn.example.com/${file.name}`,
        fileName: file.name,
        size: 100,
      });
    });

    renderPage();
    const user = await fillRequiredTextFields();
    // Pre-succeeded CV so the guard passes without needing a CV upload call.
    setBucket(CV_LABEL, [makeFile('cv.pdf', 'success', 'https://cdn.example.com/cv.pdf')]);
    setBucket(CERT_LABEL, [
      makeFile('cert-a.pdf', 'pending'),
      makeFile('cert-b.pdf', 'pending'),
      makeFile('cert-fail.pdf', 'pending'),
    ]);

    // First submit: 2 succeed, 1 fails -> uploadFiles throws -> submit aborted.
    await submit(user);
    await waitFor(() => expect(mockUploadFile).toHaveBeenCalledTimes(3));
    expect(mockSubmitApplication).not.toHaveBeenCalled();

    const certAfterFirst = getBucketState(CERT_LABEL);
    const a = certAfterFirst.find((f: any) => f.name === 'cert-a.pdf');
    const b = certAfterFirst.find((f: any) => f.name === 'cert-b.pdf');
    const failed = certAfterFirst.find((f: any) => f.name === 'cert-fail.pdf');
    expect(a.status).toBe('success');
    expect(a.url).toBe('https://cdn.example.com/cert-a.pdf');
    expect(b.status).toBe('success');
    expect(b.url).toBe('https://cdn.example.com/cert-b.pdf');
    expect(failed.status).toBe('error');

    // Second submit: the 2 succeeded files must not be re-uploaded; the
    // still-errored file is excluded (not auto-retried) rather than crashing.
    await submit(user);
    await waitFor(() => expect(mockSubmitApplication).toHaveBeenCalledTimes(1));
    expect(mockUploadFile).toHaveBeenCalledTimes(3); // no new calls

    const payload = mockSubmitApplication.mock.calls[0][0];
    expect(payload.documents).toEqual(
      expect.arrayContaining([
        { url: 'https://cdn.example.com/cv.pdf', name: 'cv.pdf', type: 'CV' },
        { url: 'https://cdn.example.com/cert-a.pdf', name: 'cert-a.pdf', type: 'CERTIFICATE' },
        { url: 'https://cdn.example.com/cert-b.pdf', name: 'cert-b.pdf', type: 'CERTIFICATE' },
      ])
    );
    expect(payload.documents).toHaveLength(3);
  });

  // Task D — D1: seed-once-by-id prefill ------------------------------------
  describe('prefill from a REJECTED application (Task D)', () => {
    it('prefills all text fields when the application is REJECTED', () => {
      const application = makeApplication();
      mockUseTeacherApplicationStatus.mockReturnValue({ application, isRejected: true });

      renderPage();

      expect(screen.getByLabelText('First Name')).toHaveValue('Jane');
      expect(screen.getByLabelText('Last Name')).toHaveValue('Doe');
      expect(screen.getByLabelText('Email')).toHaveValue('jane.doe@example.com');
      expect(screen.getByLabelText('Phone Number')).toHaveValue('0912345678');
      expect(screen.getByLabelText('Subject You Can Teach')).toHaveValue('Mathematics');
      expect(screen.getByLabelText('Years of Experience')).toHaveValue(5);
      expect(screen.getByLabelText('Qualifications')).toHaveValue('BSc Mathematics');
      expect(screen.getByLabelText('Bio (Optional)')).toHaveValue('A passionate educator.');
      expect(screen.getByLabelText('Why Do You Want to Teach?')).toHaveValue('I love teaching.');
    });

    it('does not reset a field the user is editing when a refetch returns a new application object with the same id', async () => {
      const applicationV1 = makeApplication();
      mockUseTeacherApplicationStatus.mockReturnValue({
        application: applicationV1,
        isRejected: true,
      });

      const { rerender, queryClient } = renderPage();

      expect(screen.getByLabelText('Subject You Can Teach')).toHaveValue('Mathematics');

      const user = userEvent.setup();
      await user.clear(screen.getByLabelText('Subject You Can Teach'));
      await user.type(screen.getByLabelText('Subject You Can Teach'), 'Physics');
      expect(screen.getByLabelText('Subject You Can Teach')).toHaveValue('Physics');

      // Simulate a TanStack Query refetch: same id, different object reference.
      const applicationV2 = makeApplication({ subject: 'Mathematics' });
      expect(applicationV2).not.toBe(applicationV1);
      mockUseTeacherApplicationStatus.mockReturnValue({
        application: applicationV2,
        isRejected: true,
      });

      rerender(
        <QueryClientProvider client={queryClient}>
          <TeacherApplicationPage />
        </QueryClientProvider>
      );

      expect(screen.getByLabelText('Subject You Can Teach')).toHaveValue('Physics');
    });

    it('does not prefill when the application is not REJECTED', () => {
      const application = makeApplication({ status: 'PENDING' });
      mockUseTeacherApplicationStatus.mockReturnValue({ application, isRejected: false });

      renderPage();

      expect(screen.getByLabelText('First Name')).toHaveValue('');
      expect(screen.getByLabelText('Subject You Can Teach')).toHaveValue('');
    });

    it('renders a blank form without crashing when there is no application', () => {
      mockUseTeacherApplicationStatus.mockReturnValue({ application: null, isRejected: false });

      expect(() => renderPage()).not.toThrow();
      expect(screen.getByLabelText('First Name')).toHaveValue('');
    });
  });

  // Task D — D2: retained documents list -------------------------------------
  describe('previously submitted documents list (Task D)', () => {
    it('shows retained document name + type badge, and removing one only updates client state (no API call)', async () => {
      const application = makeApplication({
        documents: [
          { name: 'old-id.pdf', url: 'https://cdn.example.com/old-id.pdf', type: 'ID_CARD' },
          { name: 'old-cert.pdf', url: 'https://cdn.example.com/old-cert.pdf', type: 'CERTIFICATE' },
        ],
      });
      mockUseTeacherApplicationStatus.mockReturnValue({ application, isRejected: true });

      renderPage();

      expect(screen.getByText('old-id.pdf')).toBeInTheDocument();
      expect(screen.getByText('old-cert.pdf')).toBeInTheDocument();
      expect(screen.getByText('ID_CARD')).toBeInTheDocument();
      expect(screen.getByText('CERTIFICATE')).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /remove old-id\.pdf/i }));

      expect(screen.queryByText('old-id.pdf')).not.toBeInTheDocument();
      expect(screen.getByText('old-cert.pdf')).toBeInTheDocument();
      expect(mockSubmitApplication).not.toHaveBeenCalled();
      expect(mockUploadFile).not.toHaveBeenCalled();
    });
  });

  // Task D — D4: CV guard extended to retained documents, no legacy exemption -
  describe('CV guard with retained documents (Task D)', () => {
    it('blocks submit when retained documents exist but none is type CV, and no new CV is uploaded', async () => {
      const application = makeApplication({
        documents: [
          { name: 'old-id.pdf', url: 'https://cdn.example.com/old-id.pdf', type: 'ID_CARD' },
          { name: 'old-cert.pdf', url: 'https://cdn.example.com/old-cert.pdf', type: 'CERTIFICATE' },
        ],
      });
      mockUseTeacherApplicationStatus.mockReturnValue({ application, isRejected: true });

      renderPage();
      // Overwrite prefilled fields is unnecessary; required fields already
      // came from the prefill, but motivation/email etc. are pre-populated too.
      await submit(userEvent.setup());

      expect(await screen.findByText(/CV \/ Resume is required/i)).toBeInTheDocument();
      expect(mockUploadFile).not.toHaveBeenCalled();
      expect(mockSubmitApplication).not.toHaveBeenCalled();
    });

    it('allows submit when a retained document is type CV and no new CV file was chosen, merging retained + newly uploaded documents', async () => {
      const application = makeApplication({
        documents: [{ name: 'old-cv.pdf', url: 'https://cdn.example.com/old-cv.pdf', type: 'CV' }],
      });
      mockUseTeacherApplicationStatus.mockReturnValue({ application, isRejected: true });

      mockUploadFile.mockResolvedValue({
        publicId: 'p1',
        url: 'https://cdn.example.com/new-cert.pdf',
        fileName: 'new-cert.pdf',
        size: 100,
      });

      renderPage();
      setBucket(CERT_LABEL, [makeFile('new-cert.pdf', 'pending')]);

      await submit(userEvent.setup());

      await waitFor(() => expect(mockSubmitApplication).toHaveBeenCalledTimes(1));
      expect(mockUploadFile).toHaveBeenCalledTimes(1);

      const payload = mockSubmitApplication.mock.calls[0][0];
      expect(payload.documents).toEqual(
        expect.arrayContaining([
          { name: 'old-cv.pdf', url: 'https://cdn.example.com/old-cv.pdf', type: 'CV' },
          { url: 'https://cdn.example.com/new-cert.pdf', name: 'new-cert.pdf', type: 'CERTIFICATE' },
        ])
      );
      expect(payload.documents).toHaveLength(2);
    });

    it('keeps retainedDocuments intact when a new-file upload fails in another bucket', async () => {
      const application = makeApplication({
        documents: [{ name: 'old-cv.pdf', url: 'https://cdn.example.com/old-cv.pdf', type: 'CV' }],
      });
      mockUseTeacherApplicationStatus.mockReturnValue({ application, isRejected: true });

      mockUploadFile.mockRejectedValue(new Error('network error'));

      renderPage();
      setBucket(CERT_LABEL, [makeFile('cert-fail.pdf', 'pending')]);

      await submit(userEvent.setup());

      await waitFor(() => expect(mockUploadFile).toHaveBeenCalledTimes(1));
      expect(mockSubmitApplication).not.toHaveBeenCalled();

      // The retained document is still shown after the failed upload.
      expect(screen.getByText('old-cv.pdf')).toBeInTheDocument();
    });
  });
});
