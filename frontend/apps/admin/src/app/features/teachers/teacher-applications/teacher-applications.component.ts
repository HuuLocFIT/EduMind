import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  ButtonComponent,
  CardComponent,
  SearchBarComponent,
  BadgeComponent,
  type BadgeVariant,
  AlertComponent,
  ModalComponent,
  TextareaComponent,
} from '@edumind/admin-ui';
import {
  ApplicationStatus,
  ReviewApplicationRequest,
  TeacherApplicationResponse,
  TeacherType,
  TrialStatusResponse,
} from '@edumind/shared-types';
import {
  TeacherApplicationService,
  type ApplicationQueryParams,
} from '../../../core/services/teacher-application.service';

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
    RouterLink,
    ButtonComponent,
    CardComponent,
    SearchBarComponent,
    BadgeComponent,
    AlertComponent,
    ModalComponent,
    TextareaComponent,
  ],
  templateUrl: './teacher-applications.component.html',
})
export class TeacherApplicationsComponent implements OnInit {
  private applicationService = inject(TeacherApplicationService);

  // State
  applications = signal<TeacherApplicationView[]>([]);
  stats = signal<ApplicationStats>({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalTrialTeachers: 0,
    expiringThisWeek: 0,
  });
  isLoading = signal(true);
  activeStatus = signal<ApplicationStatus>('PENDING');
  currentPage = signal(1);
  totalItems = signal(0);
  pageSize = 10;
  searchQuery = signal('');
  visibleApplications = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.applications();
    return this.applications().filter(
      (app) =>
        app.fullName.toLowerCase().includes(query) ||
        app.email.toLowerCase().includes(query)
    );
  });
  displayTotalItems = computed(() =>
    this.searchQuery() ? this.visibleApplications().length : this.totalItems()
  );

  // Modals
  showDetailModal = signal(false);
  showApproveModal = signal(false);
  showRejectModal = signal(false);
  selectedApplication = signal<TeacherApplicationView | null>(null);

  // Form
  approvalType: TeacherType = 'TRIAL';
  rejectReason = '';
  adminNotes = '';

  successMessage = signal('');
  errorMessage = signal('');

  statusCards: Array<{
    key: ApplicationStatus;
    label: string;
    subtitle: string;
    statKey: keyof ApplicationStats;
  }> = [
    { key: 'PENDING', label: 'Pending Review', subtitle: 'Awaiting evaluation', statKey: 'totalPending' },
    { key: 'APPROVED', label: 'Approved', subtitle: 'Ready to teach', statKey: 'totalApproved' },
    { key: 'REJECTED', label: 'Rejected', subtitle: 'Closed out', statKey: 'totalRejected' },
  ];

  filters: ApplicationQueryParams = { page: 0, size: this.pageSize, status: 'PENDING' };

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize));

  ngOnInit(): void {
    this.loadApplications();
    this.loadStats();
  }

  loadStats(): void {
    forkJoin({
      pending: this.applicationService.getApplications({ status: 'PENDING', page: 0, size: 1 }),
      approved: this.applicationService.getApplications({ status: 'APPROVED', page: 0, size: 1 }),
      rejected: this.applicationService.getApplications({ status: 'REJECTED', page: 0, size: 1 }),
      trials: this.applicationService.getTrialTeachers({ page: 0, size: 50 }),
    }).subscribe({
      next: ({ pending, approved, rejected, trials }) => {
        const trialData: TrialStatusResponse[] = trials.data ?? [];
        const expiringThisWeek = trialData.filter(
          (trial: TrialStatusResponse) =>
            typeof trial.daysRemaining === 'number' &&
            trial.daysRemaining >= 0 &&
            trial.daysRemaining <= 7
        ).length;

        this.stats.set({
          totalPending: pending.pagination?.totalElements ?? pending.data?.length ?? 0,
          totalApproved: approved.pagination?.totalElements ?? approved.data?.length ?? 0,
          totalRejected: rejected.pagination?.totalElements ?? rejected.data?.length ?? 0,
          totalTrialTeachers: trials.pagination?.totalElements ?? trialData.length,
          expiringThisWeek,
        });
      },
      error: () => this.errorMessage.set('Failed to load statistics'),
    });
  }

  loadApplications(): void {
    this.isLoading.set(true);
    this.applicationService.getApplications(this.filters).subscribe({
      next: (response) => {
        const normalized = (response.data ?? []).map((app: TeacherApplicationResponse) =>
          this.normalizeApplication(app)
        );
        this.applications.set(normalized);

        const pagination = response.pagination;
        const total = pagination?.totalElements ?? normalized.length;
        this.totalItems.set(total);
        this.currentPage.set((pagination?.page ?? 0) + 1);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load applications');
        this.isLoading.set(false);
      },
    });
  }

  onStatusChange(status: ApplicationStatus): void {
    this.activeStatus.set(status);
    this.filters.status = status;
    this.filters.page = 0;
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadApplications();
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.filters.page = page - 1;
    this.loadApplications();
  }

  getStartIndex(): number {
    if (this.searchQuery()) {
      return this.visibleApplications().length > 0 ? 1 : 0;
    }
    return (this.currentPage() - 1) * this.pageSize + 1;
  }
  getEndIndex(): number {
    if (this.searchQuery()) {
      return this.visibleApplications().length;
    }
    return Math.min(this.currentPage() * this.pageSize, this.totalItems());
  }

  getStatusVariant(status: ApplicationStatus): BadgeVariant {
    const variants: Record<ApplicationStatus, BadgeVariant> = {
      PENDING: 'warning',
      APPROVED: 'success',
      REJECTED: 'error',
    };
    return variants[status];
  }

  isActiveStatus(status: ApplicationStatus): boolean {
    return this.activeStatus() === status;
  }

  viewApplication(app: TeacherApplicationView): void {
    this.selectedApplication.set(app);
    this.showDetailModal.set(true);
  }

  openApproveModal(app: TeacherApplicationView): void {
    this.selectedApplication.set(app);
    this.approvalType = 'TRIAL';
    this.adminNotes = '';
    this.showApproveModal.set(true);
  }

  openRejectModal(app: TeacherApplicationView): void {
    this.selectedApplication.set(app);
    this.rejectReason = '';
    this.adminNotes = '';
    this.showRejectModal.set(true);
  }

  approveApplication(): void {
    const app = this.selectedApplication();
    if (app) {
      const payload: ReviewApplicationRequest = {
        action: 'APPROVE',
        teacherType: this.approvalType,
        adminNotes: this.adminNotes || undefined,
      };

      this.applicationService.reviewApplication(app.id, payload).subscribe({
        next: (res) => {
          this.successMessage.set(res.message || 'Application approved');
          this.showApproveModal.set(false);
          this.loadApplications();
          this.loadStats();
        },
        error: () => this.errorMessage.set('Failed to approve application'),
      });
    }
  }

  rejectApplication(): void {
    const app = this.selectedApplication();
    if (app && this.rejectReason) {
      const payload: ReviewApplicationRequest = {
        action: 'REJECT',
        rejectionReason: this.rejectReason,
        adminNotes: this.adminNotes || undefined,
      };

      this.applicationService.reviewApplication(app.id, payload).subscribe({
        next: (res) => {
          this.successMessage.set(res.message || 'Application rejected');
          this.showRejectModal.set(false);
          this.loadApplications();
          this.loadStats();
        },
        error: () => this.errorMessage.set('Failed to reject application'),
      });
    }
  }

  private normalizeApplication(app: TeacherApplicationResponse): TeacherApplicationView {
    const fullName = `${app.firstName ?? ''} ${app.lastName ?? ''}`.trim()
      || app.username
      || app.email;

    return {
      ...app,
      fullName,
      documents: app.documents ?? [],
    };
  }
}