import { Component, OnInit, TemplateRef, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  DataTableComponent,
  type TableColumn,
  ModalComponent,
  TextareaComponent,
  type BadgeVariant,
} from '@edumind/admin-ui';
import { AdminEnrollmentService } from '../../core/services/admin-enrollment.service';
import {
  EnrollmentReportResponse,
  ReportRequestStatus,
} from '@edumind/shared-types';

type ReportRow = EnrollmentReportResponse;
type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

@Component({
  selector: 'app-enrollment-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardComponent,
    ButtonComponent,
    BadgeComponent,
    AlertComponent,
    DataTableComponent,
    ModalComponent,
    TextareaComponent,
  ],
  templateUrl: './enrollment-reports.component.html',
})
export class EnrollmentReportsComponent implements OnInit {
  private adminEnrollmentService = inject(AdminEnrollmentService);

  reports = signal<ReportRow[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');

  statusFilter = signal<StatusFilter>('ALL');
  pageSize = 10;
  currentPage = signal(1);
  totalItems = signal(0);

  // Stats from server
  statsPending = signal(0);
  statsApproved = signal(0);
  statsRejected = signal(0);

  // Stats computed
  stats = computed(() => {
    return {
      pending: this.statsPending(),
      approved: this.statsApproved(),
      rejected: this.statsRejected(),
    };
  });

  // Table columns
  columns: TableColumn<ReportRow>[] = [];
  actionsSticky = signal<'left' | 'right' | undefined>('right');

  // Templates
  @ViewChild('studentTpl', { static: true })
  studentTpl!: TemplateRef<{ $implicit: ReportRow; row: ReportRow; index: number }>;
  @ViewChild('courseTpl', { static: true })
  courseTpl!: TemplateRef<{ $implicit: ReportRow; row: ReportRow; index: number }>;
  @ViewChild('reasonTpl', { static: true })
  reasonTpl!: TemplateRef<{ $implicit: ReportRow; row: ReportRow; index: number }>;
  @ViewChild('statusTpl', { static: true })
  statusTpl!: TemplateRef<{ $implicit: ReportRow; row: ReportRow; index: number }>;
  @ViewChild('requestedAtTpl', { static: true })
  requestedAtTpl!: TemplateRef<{ $implicit: ReportRow; row: ReportRow; index: number }>;

  // Modals
  showDetailModal = signal(false);
  showApproveModal = signal(false);
  showRejectModal = signal(false);
  selectedReport = signal<ReportRow | null>(null);

  // Form state
  approveNotes = '';
  rejectNotes = '';
  rejectNotesError = signal('');

  ngOnInit(): void {
    this.buildColumns();
    this.loadStats();
    this.loadReports();
  }

  private buildColumns(): void {
    this.columns = [
      {
        key: 'studentId',
        header: 'Student',
        template: this.studentTpl,
        sortable: true,
        width: '150px',
      },
      {
        key: 'courseTitle',
        header: 'Course',
        template: this.courseTpl,
        sortable: true,
        width: '250px',
      },
      {
        key: 'reason',
        header: 'Reason',
        template: this.reasonTpl,
        width: '300px',
      },
      {
        key: 'status',
        header: 'Status',
        template: this.statusTpl,
        sortable: true,
        width: '120px',
      },
      {
        key: 'requestedAt',
        header: 'Requested At',
        template: this.requestedAtTpl,
        sortable: true,
        width: '150px',
      },
    ];
  }

  loadStats(): void {
    // Load stats in parallel: pending, approved, rejected
    forkJoin({
      pending: this.adminEnrollmentService.getReports({ status: 'PENDING', page: 0, size: 1 }),
      approved: this.adminEnrollmentService.getReports({ status: 'APPROVED', page: 0, size: 1 }),
      rejected: this.adminEnrollmentService.getReports({ status: 'REJECTED', page: 0, size: 1 }),
    }).subscribe({
      next: ({ pending, approved, rejected }) => {
        this.statsPending.set(pending.pagination?.totalElements ?? 0);
        this.statsApproved.set(approved.pagination?.totalElements ?? 0);
        this.statsRejected.set(rejected.pagination?.totalElements ?? 0);
      },
      error: () => {
        // Silently fail stats loading, don't show error
      },
    });
  }

  loadReports(): void {
    this.isLoading.set(true);
    const page = this.currentPage() - 1;
    const status = this.statusFilter();

    const statusFilter: ReportRequestStatus | undefined =
      status === 'PENDING' ? 'PENDING' :
      status === 'APPROVED' ? 'APPROVED' :
      status === 'REJECTED' ? 'REJECTED' :
      undefined;

    this.adminEnrollmentService.getReports({
      status: statusFilter,
      page,
      size: this.pageSize,
    }).subscribe({
      next: (response) => {
        const items = response.data ?? [];
        this.reports.set(items);
        const total = response.pagination?.totalElements ?? items.length;
        const pageIndex = response.pagination?.page ?? page;
        this.totalItems.set(total);
        this.currentPage.set(pageIndex + 1);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load enrollment reports');
        this.isLoading.set(false);
      },
    });
  }

  onStatusFilterChange(filter: StatusFilter): void {
    this.statusFilter.set(filter);
    this.currentPage.set(1);
    this.loadReports();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadReports();
  }

  openDetailModal(report: ReportRow): void {
    this.selectedReport.set(report);
    this.showDetailModal.set(true);
  }

  openApproveModal(report: ReportRow): void {
    this.selectedReport.set(report);
    this.approveNotes = '';
    this.showApproveModal.set(true);
  }

  openRejectModal(report: ReportRow): void {
    this.selectedReport.set(report);
    this.rejectNotes = '';
    this.rejectNotesError.set('');
    this.showRejectModal.set(true);
  }

  approveReport(): void {
    const report = this.selectedReport();
    if (!report) return;

    this.adminEnrollmentService.approveReport(report.id, this.approveNotes || undefined).subscribe({
      next: () => {
        this.successMessage.set('Report approved successfully');
        this.showApproveModal.set(false);
        this.loadStats();
        this.loadReports();
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: () => {
        this.errorMessage.set('Failed to approve report');
        setTimeout(() => this.errorMessage.set(''), 5000);
      },
    });
  }

  rejectReport(): void {
    const report = this.selectedReport();
    if (!report) return;

    if (!this.rejectNotes.trim()) {
      this.rejectNotesError.set('Rejection reason is required');
      return;
    }

    this.rejectNotesError.set('');

    this.adminEnrollmentService.rejectReport(report.id, this.rejectNotes).subscribe({
      next: () => {
        this.successMessage.set('Report rejected successfully');
        this.showRejectModal.set(false);
        this.loadStats();
        this.loadReports();
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: () => {
        this.errorMessage.set('Failed to reject report');
        setTimeout(() => this.errorMessage.set(''), 5000);
      },
    });
  }

  getStatusVariant(status: ReportRequestStatus): BadgeVariant {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      default:
        return 'default';
    }
  }

  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
