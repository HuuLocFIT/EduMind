import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ButtonComponent,
  CardComponent,
  SearchBarComponent,
  BadgeComponent,
  type BadgeVariant,
  AlertComponent,
  ModalComponent,
  TextareaComponent,
  EmptyStateComponent,
  SelectComponent,
  type SelectOption,
  StatCardComponent,
  type StatCardTone,
} from '@edumind/admin-ui';
import {
  ApplicationStatus,
  ReviewApplicationRequest,
  TeacherApplicationResponse,
  TeacherType,
} from '@edumind/shared-types';
import {
  TeacherApplicationService,
  type ApplicationQueryParams,
} from '../../../core/services/teacher-application.service';
import { injectAsyncState, injectModal, injectPagination, getStatusVariant } from '../../../core/utils';
import { DocumentTypeLabelPipe } from '../../../shared/pipes/document-type-label.pipe';

type ApplicationStats = {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalTrialTeachers: number;
  expiringThisWeek: number;
};

type TeacherApplicationView = TeacherApplicationResponse & {
  fullName: string;
  documents: NonNullable<TeacherApplicationResponse['documents']>;
};

@Component({
  selector: 'app-teacher-applications',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    CardComponent,
    SearchBarComponent,
    BadgeComponent,
    AlertComponent,
    ModalComponent,
    TextareaComponent,
    EmptyStateComponent,
    SelectComponent,
    StatCardComponent,
    DocumentTypeLabelPipe,
  ],
  templateUrl: './teacher-applications.component.html',
})
export class TeacherApplicationsComponent implements OnInit {
  private applicationService = inject(TeacherApplicationService);

  // ── Utilities ────────────────────────────────────────────────────────────
  private pagination = injectPagination<TeacherApplicationView>();
  currentPage = this.pagination.currentPage;
  totalItems = this.pagination.totalItems;
  totalPages = this.pagination.totalPages;
  readonly pageSize = this.pagination.pageSize;

  private async = injectAsyncState();
  isLoading = this.async.isLoading;
  errorMessage = this.async.errorMessage;
  successMessage = this.async.successMessage;
  actionErrorMessage = signal('');

  private detailModal = injectModal<TeacherApplicationView>();
  private approveModal = injectModal<TeacherApplicationView>();
  private rejectModal = injectModal<TeacherApplicationView>();
  showDetailModal = this.detailModal.isOpen;
  showApproveModal = this.approveModal.isOpen;
  showRejectModal = this.rejectModal.isOpen;
  selectedApplication = this.detailModal.data;

  // ── Data ─────────────────────────────────────────────────────────────────
  applications = signal<TeacherApplicationView[]>([]);
  stats = signal<ApplicationStats>({
    totalPending: 0, totalApproved: 0, totalRejected: 0, totalTrialTeachers: 0, expiringThisWeek: 0,
  });
  activeStatus = signal<ApplicationStatus>('PENDING');
  searchQuery = signal('');

  // ── Form ─────────────────────────────────────────────────────────────────
  approvalType: TeacherType = 'TRIAL';
  rejectReason = '';
  adminNotes = '';

  readonly statusCards: Array<{
    key: ApplicationStatus;
    label: string;
    subtitle: string;
    statKey: keyof ApplicationStats;
    tone: StatCardTone;
    iconPath: string;
  }> = [
      {
        key: 'PENDING',
        label: 'Pending Review',
        subtitle: 'Awaiting evaluation',
        statKey: 'totalPending',
        tone: 'warning',
        iconPath:
          'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      },
      {
        key: 'APPROVED',
        label: 'Approved',
        subtitle: 'Ready to teach',
        statKey: 'totalApproved',
        tone: 'success',
        iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      },
      {
        key: 'REJECTED',
        label: 'Rejected',
        subtitle: 'Closed out',
        statKey: 'totalRejected',
        tone: 'danger',
        iconPath:
          'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      },
    ];

  readonly statusOptions: SelectOption[] = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  filters: ApplicationQueryParams = { page: 0, size: this.pageSize, status: 'PENDING' };

  ngOnInit(): void {
    this.loadApplications();
    this.loadStats();
  }

  loadStats(): void {
    this.async.execute(this.applicationService.getStats(), {
      silent: true,
      onSuccess: (stats) => {
        this.stats.set({
          totalPending: stats.totalPending,
          totalApproved: stats.totalApproved,
          totalRejected: stats.totalRejected,
          totalTrialTeachers: stats.totalTrialTeachers,
          expiringThisWeek: stats.expiringThisWeek,
        });
      },
    });
  }

  loadApplications(): void {
    this.async.execute(this.applicationService.getApplications(this.filters), {
      errorMsg: 'Failed to load applications',
      onSuccess: (response) => {
        const normalized = (response.data ?? []).map((app: TeacherApplicationResponse) =>
          this.normalizeApplication(app)
        );
        this.pagination.applyPagedResponse(
          { data: normalized, pagination: response.pagination },
          (items) => this.applications.set(items),
        );
      },
    });
  }

  onStatusChange(status: string | number): void {
    const nextStatus = status as ApplicationStatus;
    this.activeStatus.set(nextStatus);
    this.filters.status = nextStatus;
    this.filters.page = 0;
    this.filters.search = undefined;
    this.searchQuery.set('');
    this.pagination.resetPage();
    this.loadApplications();
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.filters.search = query || undefined;
    this.filters.page = 0;
    this.pagination.resetPage();
    this.loadApplications();
  }

  goToPage(page: number): void {
    this.filters.page = page - 1;
    this.pagination.goToPage(page);
    this.loadApplications();
  }

  getStartIndex(): number { return this.pagination.getStartIndex(); }
  getEndIndex(): number { return this.pagination.getEndIndex(); }

  getStatusVariant(status: ApplicationStatus): BadgeVariant {
    return getStatusVariant(status);
  }

  viewApplication(app: TeacherApplicationView): void {
    this.detailModal.open(app);
  }

  openApproveModal(app: TeacherApplicationView): void {
    this.actionErrorMessage.set('');
    this.selectedApplication.set(app);
    this.approvalType = 'TRIAL';
    this.adminNotes = '';
    this.approveModal.open(app);
  }

  openRejectModal(app: TeacherApplicationView): void {
    this.actionErrorMessage.set('');
    this.selectedApplication.set(app);
    this.rejectReason = '';
    this.adminNotes = '';
    this.rejectModal.open(app);
  }

  approveApplication(): void {
    const app = this.selectedApplication();
    if (!app) return;

    const payload: ReviewApplicationRequest = {
      action: 'APPROVE',
      teacherType: this.approvalType,
      adminNotes: this.adminNotes || undefined,
    };

    this.async.execute(this.applicationService.reviewApplication(app.id, payload), {
      submitting: true,
      errorMsg: 'Failed to approve application',
      errorTarget: this.actionErrorMessage,
      onSuccess: (res) => {
        this.successMessage.set(res.message || 'Application approved');
        this.approveModal.close();
        this.loadApplications();
        this.loadStats();
      },
    });
  }

  rejectApplication(): void {
    const app = this.selectedApplication();
    if (!app || !this.rejectReason) return;

    const payload: ReviewApplicationRequest = {
      action: 'REJECT',
      rejectionReason: this.rejectReason,
      adminNotes: this.adminNotes || undefined,
    };

    this.async.execute(this.applicationService.reviewApplication(app.id, payload), {
      submitting: true,
      errorMsg: 'Failed to reject application',
      errorTarget: this.actionErrorMessage,
      onSuccess: (res) => {
        this.successMessage.set(res.message || 'Application rejected');
        this.rejectModal.close();
        this.loadApplications();
        this.loadStats();
      },
    });
  }

  private normalizeApplication(app: TeacherApplicationResponse): TeacherApplicationView {
    const fullName =
      `${app.firstName ?? ''} ${app.lastName ?? ''}`.trim() || app.username || app.email;
    return { ...app, fullName, documents: app.documents ?? [] };
  }
}
