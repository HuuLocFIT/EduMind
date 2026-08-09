import { Component, OnInit, TemplateRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  DataTableComponent,
  type TableColumn,
  ModalComponent,
  TextareaComponent,
  DropdownMenuComponent,
  type DropdownMenuItem,
  type BadgeVariant,
  SelectComponent,
  type SelectOption,
  StatCardComponent,
} from '@edumind/admin-ui';
import { AdminEnrollmentService } from '../../core/services/admin-enrollment.service';
import { EnrollmentReportResponse, ReportRequestStatus } from '@edumind/shared-types';
import { injectAsyncState, injectModal, injectPagination, getStatusVariant, injectMediaQuery } from '../../core/utils';

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
    DropdownMenuComponent,
    SelectComponent,
    StatCardComponent,
  ],
  templateUrl: './enrollment-reports.component.html',
})
export class EnrollmentReportsComponent implements OnInit {
  private adminEnrollmentService = inject(AdminEnrollmentService);

  // ── Utilities ────────────────────────────────────────────────────────────
  private pagination = injectPagination<ReportRow>();
  currentPage = this.pagination.currentPage;
  totalItems = this.pagination.totalItems;
  readonly pageSize = this.pagination.pageSize;

  private async = injectAsyncState();
  isLoading = this.async.isLoading;
  errorMessage = this.async.errorMessage;
  successMessage = this.async.successMessage;

  private detailModal = injectModal<ReportRow>();
  private approveModal = injectModal<ReportRow>();
  private rejectModal = injectModal<ReportRow>();
  showDetailModal = this.detailModal.isOpen;
  showApproveModal = this.approveModal.isOpen;
  showRejectModal = this.rejectModal.isOpen;
  /** Shared selection — kept in sync by all open* methods */
  selectedReport = this.detailModal.data;

  // ── Data ─────────────────────────────────────────────────────────────────
  reports = signal<ReportRow[]>([]);
  statusFilter = signal<StatusFilter>('ALL');

  readonly statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  statsPending = signal(0);
  statsApproved = signal(0);
  statsRejected = signal(0);

  // ── Table ─────────────────────────────────────────────────────────────────
  isMobile = injectMediaQuery('(max-width: 768px)');
  columns: TableColumn<ReportRow>[] = [];
  actionsSticky = signal<'left' | 'right' | undefined>('right');

  @ViewChild('studentTpl', { static: true }) studentTpl!: TemplateRef<{ $implicit: ReportRow; row: ReportRow; index: number }>;
  @ViewChild('courseTpl', { static: true }) courseTpl!: TemplateRef<{ $implicit: ReportRow; row: ReportRow; index: number }>;
  @ViewChild('reasonTpl', { static: true }) reasonTpl!: TemplateRef<{ $implicit: ReportRow; row: ReportRow; index: number }>;
  @ViewChild('statusTpl', { static: true }) statusTpl!: TemplateRef<{ $implicit: ReportRow; row: ReportRow; index: number }>;
  @ViewChild('requestedAtTpl', { static: true }) requestedAtTpl!: TemplateRef<{ $implicit: ReportRow; row: ReportRow; index: number }>;

  // ── Form state ────────────────────────────────────────────────────────────
  approveNotes = '';
  rejectNotes = '';
  rejectNotesError = signal('');

  ngOnInit(): void {
    this.buildColumns();
    this.loadStats();
    this.loadReports();
  }

  private buildColumns(): void {
    const stickyLeft: 'left' | undefined = this.isMobile() ? undefined : 'left';
    const stickyRight: 'right' | undefined = this.isMobile() ? undefined : 'right';
    this.columns = [
      { key: 'studentId', header: 'Student', template: this.studentTpl, sortable: false, width: '180px', sticky: stickyLeft, stickyOffset: stickyLeft ? '0px' : undefined },
      { key: 'courseTitle', header: 'Course', template: this.courseTpl, sortable: false, width: '280px' },
      { key: 'reason', header: 'Reason', template: this.reasonTpl, width: '220px' },
      { key: 'status', header: 'Status', template: this.statusTpl, sortable: false, width: '120px' },
      { key: 'requestedAt', header: 'Requested At', template: this.requestedAtTpl, sortable: false, width: '170px' },
    ];
    this.actionsSticky.set(stickyRight);
  }

  loadStats(): void {
    this.async.execute(this.adminEnrollmentService.getReportStats(), {
      silent: true,
      onSuccess: (stats) => {
        this.statsPending.set(stats.pending);
        this.statsApproved.set(stats.approved);
        this.statsRejected.set(stats.rejected);
      },
    });
  }

  loadReports(): void {
    const page = this.currentPage() - 1;
    const status = this.statusFilter();
    const statusFilter = status === 'ALL' ? undefined : status as ReportRequestStatus;

    this.async.execute(
      this.adminEnrollmentService.getReports({ status: statusFilter, page, size: this.pageSize }),
      {
        errorMsg: 'Failed to load enrollment reports',
        onSuccess: (response) => {
          this.pagination.applyPagedResponse(response, (items) => this.reports.set(items));
        },
      },
    );
  }

  onStatusFilterChange(filter: StatusFilter): void {
    this.statusFilter.set(filter);
    this.pagination.resetPage();
    this.loadReports();
  }

  onPageChange(page: number): void {
    this.pagination.goToPage(page);
    this.loadReports();
  }

  openDetailModal(report: ReportRow): void {
    this.detailModal.open(report);
  }

  openApproveModal(report: ReportRow): void {
    this.selectedReport.set(report);
    this.approveNotes = '';
    this.approveModal.open(report);
  }

  openRejectModal(report: ReportRow): void {
    this.selectedReport.set(report);
    this.rejectNotes = '';
    this.rejectNotesError.set('');
    this.rejectModal.open(report);
  }

  approveReport(): void {
    const report = this.selectedReport();
    if (!report) return;

    this.async.execute(
      this.adminEnrollmentService.approveReport(report.id, this.approveNotes || undefined),
      {
        submitting: true,
        successMsg: 'Report approved successfully',
        errorMsg: 'Failed to approve report',
        onSuccess: () => {
          this.approveModal.close();
          this.statsPending.update(v => v - 1);
          this.statsApproved.update(v => v + 1);
          this.loadReports();
        },
      },
    );
  }

  rejectReport(): void {
    const report = this.selectedReport();
    if (!report) return;

    if (!this.rejectNotes.trim()) {
      this.rejectNotesError.set('Rejection reason is required');
      return;
    }
    this.rejectNotesError.set('');

    this.async.execute(
      this.adminEnrollmentService.rejectReport(report.id, this.rejectNotes),
      {
        submitting: true,
        successMsg: 'Report rejected successfully',
        errorMsg: 'Failed to reject report',
        onSuccess: () => {
          this.rejectModal.close();
          this.statsPending.update(v => v - 1);
          this.statsRejected.update(v => v + 1);
          this.loadReports();
        },
      },
    );
  }

  getStatusVariant(status: ReportRequestStatus): BadgeVariant {
    return getStatusVariant(status);
  }

  getRowActions(report: ReportRow): DropdownMenuItem[] {
    if (report.status !== 'PENDING') return [];

    return [
      { id: 'approve', label: 'Approve' },
      { id: 'reject', label: 'Reject', danger: true },
    ];
  }

  onRowAction(item: DropdownMenuItem, report: ReportRow): void {
    if (item.id === 'approve') {
      this.openApproveModal(report);
    } else if (item.id === 'reject') {
      this.openRejectModal(report);
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
}
