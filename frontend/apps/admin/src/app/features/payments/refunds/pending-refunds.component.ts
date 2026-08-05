import { Component, OnInit, TemplateRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ButtonComponent,
  CardComponent,
  BadgeComponent,
  AlertComponent,
  ModalComponent,
  TextareaComponent,
  DataTableComponent,
  type TableColumn,
} from '@edumind/admin-ui';
import { RefundResponse } from '@edumind/shared-types';
import { AdminRefundService } from '../../../core/services/admin-refund.service';
import { injectAsyncState, injectModal, injectPagination, injectMediaQuery } from '../../../core/utils';

type RefundRow = RefundResponse;

@Component({
  selector: 'app-pending-refunds',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    AlertComponent,
    ModalComponent,
    TextareaComponent,
    DataTableComponent,
  ],
  templateUrl: './pending-refunds.component.html',
})
export class PendingRefundsComponent implements OnInit {
  private refundService = inject(AdminRefundService);

  // ── Utilities ────────────────────────────────────────────────────────────
  private pagination = injectPagination<RefundRow>();
  currentPage = this.pagination.currentPage;
  totalItems = this.pagination.totalItems;
  totalPages = this.pagination.totalPages;
  readonly pageSize = this.pagination.pageSize;

  private async = injectAsyncState();
  isLoading = this.async.isLoading;
  errorMessage = this.async.errorMessage;
  successMessage = this.async.successMessage;

  private approveModal = injectModal<RefundRow>();
  private rejectModal = injectModal<RefundRow>();
  private confirmManualModal = injectModal<RefundRow>();
  showApproveModal = this.approveModal.isOpen;
  showRejectModal = this.rejectModal.isOpen;
  showConfirmManualModal = this.confirmManualModal.isOpen;
  selectedRefund = this.approveModal.data;

  // ── Data ─────────────────────────────────────────────────────────────────
  refunds = signal<RefundRow[]>([]);

  // ── Table ─────────────────────────────────────────────────────────────────
  isMobile = injectMediaQuery('(max-width: 768px)');
  columns: TableColumn<RefundRow>[] = [];
  actionsSticky = signal<'left' | 'right' | undefined>('right');

  @ViewChild('orderNumberTpl', { static: true }) orderNumberTpl!: TemplateRef<{ $implicit: RefundRow; row: RefundRow; index: number }>;
  @ViewChild('statusTpl', { static: true }) statusTpl!: TemplateRef<{ $implicit: RefundRow; row: RefundRow; index: number }>;
  @ViewChild('amountTpl', { static: true }) amountTpl!: TemplateRef<{ $implicit: RefundRow; row: RefundRow; index: number }>;
  @ViewChild('reasonTpl', { static: true }) reasonTpl!: TemplateRef<{ $implicit: RefundRow; row: RefundRow; index: number }>;
  @ViewChild('requestedAtTpl', { static: true }) requestedAtTpl!: TemplateRef<{ $implicit: RefundRow; row: RefundRow; index: number }>;
  @ViewChild('userIdTpl', { static: true }) userIdTpl!: TemplateRef<{ $implicit: RefundRow; row: RefundRow; index: number }>;

  // ── Form state ────────────────────────────────────────────────────────────
  approveNotes = '';
  rejectReason = '';
  bankTransferReference = '';

  ngOnInit(): void {
    this.buildColumns();
    this.loadRefunds();
  }

  private buildColumns(): void {
    const stickyLeft: 'left' | undefined = this.isMobile() ? undefined : 'left';
    const stickyRight: 'right' | undefined = this.isMobile() ? undefined : 'right';
    this.columns = [
      { key: 'orderNumber', header: 'Order#', template: this.orderNumberTpl, sortable: false, width: '170px', sticky: stickyLeft, stickyOffset: stickyLeft ? '0px' : undefined },
      { key: 'userId', header: 'User ID', template: this.userIdTpl, sortable: false, width: '90px', align: 'left' },
      { key: 'status', header: 'Status', template: this.statusTpl, sortable: false, width: '220px' },
      { key: 'requestedAmount', header: 'Amount', template: this.amountTpl, sortable: false, width: '110px', align: 'left' },
      { key: 'reason', header: 'Reason', template: this.reasonTpl, width: '350px' },
      { key: 'requestedAt', header: 'Requested At', template: this.requestedAtTpl, sortable: false, width: '130px' },
    ];
    this.actionsSticky.set(stickyRight);
  }

  loadRefunds(): void {
    this.async.execute(
      this.refundService.getPendingRefunds({
        page: this.currentPage() - 1,
        size: this.pageSize,
        sortBy: 'requestedAt',
        sortOrder: 'desc',
      }),
      {
        errorMsg: 'Failed to load pending refunds',
        onSuccess: (response) => {
          this.pagination.applyPagedResponse(response, (items) => this.refunds.set(items));
        },
      },
    );
  }

  openApproveModal(refund: RefundRow): void {
    this.selectedRefund.set(refund);
    this.approveNotes = '';
    this.approveModal.open(refund);
  }

  openRejectModal(refund: RefundRow): void {
    this.selectedRefund.set(refund);
    this.rejectReason = '';
    this.rejectModal.open(refund);
  }

  openConfirmManualModal(refund: RefundRow): void {
    this.selectedRefund.set(refund);
    this.bankTransferReference = '';
    this.confirmManualModal.open(refund);
  }

  approveRefund(): void {
    const refund = this.selectedRefund();
    if (!refund) return;

    this.async.execute(
      this.refundService.approveRefund(refund.id, this.approveNotes || undefined),
      {
        submitting: true,
        successMsg: 'Refund approved successfully',
        errorMsg: 'Failed to approve refund',
        onSuccess: () => {
          this.approveModal.close();
          this.loadRefunds();
        },
      },
    );
  }

  rejectRefund(): void {
    const refund = this.selectedRefund();
    if (!refund || !this.rejectReason.trim()) return;

    this.async.execute(
      this.refundService.rejectRefund(refund.id, this.rejectReason),
      {
        submitting: true,
        successMsg: 'Refund rejected successfully',
        errorMsg: 'Failed to reject refund',
        onSuccess: () => {
          this.rejectModal.close();
          this.loadRefunds();
        },
      },
    );
  }

  confirmManualRefund(): void {
    const refund = this.selectedRefund();
    if (!refund || !this.bankTransferReference.trim()) return;

    this.async.execute(
      this.refundService.confirmManualRefund(refund.id, this.bankTransferReference),
      {
        submitting: true,
        successMsg: 'Manual refund confirmed successfully',
        errorMsg: 'Failed to confirm manual refund',
        onSuccess: () => {
          this.confirmManualModal.close();
          this.loadRefunds();
        },
      },
    );
  }

  onPageChange(page: number): void {
    this.pagination.goToPage(page);
    this.loadRefunds();
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
