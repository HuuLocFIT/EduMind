import { Component, OnInit, TemplateRef, ViewChild, inject, signal, computed } from '@angular/core';
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
import {
  RefundResponse,
} from '@edumind/shared-types';
import {
  AdminRefundService,
} from '../../../core/services/admin-refund.service';

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

  // State (signals)
  refunds = signal<RefundRow[]>([]);
  isLoading = signal(true);
  currentPage = signal(1);
  totalItems = signal(0);
  pageSize = 10;

  // Table columns
  columns: TableColumn<RefundRow>[] = [];
  actionsSticky = signal<'left' | 'right' | undefined>('right');

  // Templates
  @ViewChild('orderNumberTpl', { static: true })
  orderNumberTpl!: TemplateRef<{ $implicit: RefundRow; row: RefundRow; index: number }>;
  @ViewChild('statusTpl', { static: true })
  statusTpl!: TemplateRef<{ $implicit: RefundRow; row: RefundRow; index: number }>;
  @ViewChild('amountTpl', { static: true })
  amountTpl!: TemplateRef<{ $implicit: RefundRow; row: RefundRow; index: number }>;
  @ViewChild('reasonTpl', { static: true })
  reasonTpl!: TemplateRef<{ $implicit: RefundRow; row: RefundRow; index: number }>;
  @ViewChild('requestedAtTpl', { static: true })
  requestedAtTpl!: TemplateRef<{ $implicit: RefundRow; row: RefundRow; index: number }>;
  @ViewChild('userIdTpl', { static: true })
  userIdTpl!: TemplateRef<{ $implicit: RefundRow; row: RefundRow; index: number }>;

  // Modals
  showApproveModal = signal(false);
  showRejectModal = signal(false);
  showConfirmManualModal = signal(false);
  selectedRefund = signal<RefundRow | null>(null);

  // Form state
  approveNotes = '';
  rejectReason = '';
  bankTransferReference = '';

  // Messages
  successMessage = signal('');
  errorMessage = signal('');

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize));

  ngOnInit(): void {
    this.buildColumns();
    this.loadRefunds();
  }

  private buildColumns(): void {
    this.columns = [
      {
        key: 'orderNumber',
        header: 'Order#',
        template: this.orderNumberTpl,
        sortable: true,
        width: '170px',
        sticky: 'left',
        stickyOffset: '0px',
      },
      {
        key: 'userId',
        header: 'User ID',
        template: this.userIdTpl,
        sortable: true,
        width: '90px',
        align: 'left',
      },
      {
        key: 'status',
        header: 'Status',
        template: this.statusTpl,
        sortable: true,
        width: '220px',
      },
      {
        key: 'requestedAmount',
        header: 'Amount',
        template: this.amountTpl,
        sortable: true,
        align: 'left',
        width: '110px',
      },
      {
        key: 'reason',
        header: 'Reason',
        template: this.reasonTpl,
        width: '350px',
      },
      {
        key: 'requestedAt',
        header: 'Requested At',
        template: this.requestedAtTpl,
        sortable: true,
        width: '130px',
      },
    ];
  }

  loadRefunds(): void {
    this.isLoading.set(true);
    this.refundService.getPendingRefunds({
      page: this.currentPage() - 1,
      size: this.pageSize,
      sortBy: 'requestedAt',
      sortOrder: 'desc',
    }).subscribe({
      next: (response) => {
        this.refunds.set(response.data ?? []);
        this.totalItems.set(response.pagination?.totalElements ?? 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load pending refunds');
        this.isLoading.set(false);
      },
    });
  }

  openApproveModal(refund: RefundRow): void {
    this.selectedRefund.set(refund);
    this.approveNotes = '';
    this.showApproveModal.set(true);
  }

  openRejectModal(refund: RefundRow): void {
    this.selectedRefund.set(refund);
    this.rejectReason = '';
    this.showRejectModal.set(true);
  }

  openConfirmManualModal(refund: RefundRow): void {
    this.selectedRefund.set(refund);
    this.bankTransferReference = '';
    this.showConfirmManualModal.set(true);
  }

  approveRefund(): void {
    const refund = this.selectedRefund();
    if (!refund) return;

    this.refundService.approveRefund(refund.id, this.approveNotes || undefined).subscribe({
      next: () => {
        this.successMessage.set('Refund approved successfully');
        this.showApproveModal.set(false);
        this.loadRefunds();
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: () => {
        this.errorMessage.set('Failed to approve refund');
        setTimeout(() => this.errorMessage.set(''), 5000);
      },
    });
  }

  rejectRefund(): void {
    const refund = this.selectedRefund();
    if (!refund || !this.rejectReason.trim()) return;

    this.refundService.rejectRefund(refund.id, this.rejectReason).subscribe({
      next: () => {
        this.successMessage.set('Refund rejected successfully');
        this.showRejectModal.set(false);
        this.loadRefunds();
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: () => {
        this.errorMessage.set('Failed to reject refund');
        setTimeout(() => this.errorMessage.set(''), 5000);
      },
    });
  }

  confirmManualRefund(): void {
    const refund = this.selectedRefund();
    if (!refund || !this.bankTransferReference.trim()) return;

    this.refundService.confirmManualRefund(refund.id, this.bankTransferReference).subscribe({
      next: () => {
        this.successMessage.set('Manual refund confirmed successfully');
        this.showConfirmManualModal.set(false);
        this.loadRefunds();
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: () => {
        this.errorMessage.set('Failed to confirm manual refund');
        setTimeout(() => this.errorMessage.set(''), 5000);
      },
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadRefunds();
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
