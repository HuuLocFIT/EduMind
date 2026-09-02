import { Component, OnInit, TemplateRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ButtonComponent,
  CardComponent,
  BadgeComponent,
  AlertComponent,
  ModalComponent,
  InputComponent,
  TextareaComponent,
  DataTableComponent,
  type TableColumn,
} from '@edumind/admin-ui';
import { PayoutResponse } from '@edumind/shared-types';
import { PayoutMethod, PayoutStatus } from '@edumind/shared-constants';
import { AdminPayoutService } from '../../../core/services/admin-payout.service';
import { injectAsyncState, injectModal, injectPagination, injectMediaQuery } from '../../../core/utils';

type PayoutRow = PayoutResponse;

@Component({
  selector: 'app-pending-payouts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    AlertComponent,
    ModalComponent,
    InputComponent,
    TextareaComponent,
    DataTableComponent,
  ],
  templateUrl: './pending-payouts.component.html',
})
export class PendingPayoutsComponent implements OnInit {
  private payoutService = inject(AdminPayoutService);

  // ── Utilities ────────────────────────────────────────────────────────────
  private pagination = injectPagination<PayoutRow>();
  currentPage = this.pagination.currentPage;
  totalItems = this.pagination.totalItems;
  totalPages = this.pagination.totalPages;
  readonly pageSize = this.pagination.pageSize;

  private async = injectAsyncState();
  isLoading = this.async.isLoading;
  isSubmitting = this.async.isSubmitting;
  errorMessage = this.async.errorMessage;
  successMessage = this.async.successMessage;
  modalErrorMessage = signal('');

  private processModal = injectModal<PayoutRow>();
  private editRecipientModal = injectModal<PayoutRow>();
  private confirmManualModal = injectModal<PayoutRow>();
  showProcessModal = this.processModal.isOpen;
  showEditRecipientModal = this.editRecipientModal.isOpen;
  showConfirmManualModal = this.confirmManualModal.isOpen;
  selectedPayout = this.processModal.data;

  // ── Data ─────────────────────────────────────────────────────────────────
  payouts = signal<PayoutRow[]>([]);

  // ── Form state ────────────────────────────────────────────────────────────
  paymentMethod = '';
  bankAccount = '';
  bankName = '';
  accountHolderName = '';
  swiftCode = '';
  bankAddress = '';
  paypalEmail = '';
  bankTransferReference = '';

  // ── Table ─────────────────────────────────────────────────────────────────
  isMobile = injectMediaQuery('(max-width: 768px)');
  columns: TableColumn<PayoutRow>[] = [];
  actionsSticky = signal<'left' | 'right' | undefined>('right');

  @ViewChild('payoutNumberTpl', { static: true }) payoutNumberTpl!: TemplateRef<{ $implicit: PayoutRow; row: PayoutRow; index: number }>;
  @ViewChild('instructorIdTpl', { static: true }) instructorIdTpl!: TemplateRef<{ $implicit: PayoutRow; row: PayoutRow; index: number }>;
  @ViewChild('amountTpl', { static: true }) amountTpl!: TemplateRef<{ $implicit: PayoutRow; row: PayoutRow; index: number }>;
  @ViewChild('methodTpl', { static: true }) methodTpl!: TemplateRef<{ $implicit: PayoutRow; row: PayoutRow; index: number }>;
  @ViewChild('earningsCountTpl', { static: true }) earningsCountTpl!: TemplateRef<{ $implicit: PayoutRow; row: PayoutRow; index: number }>;
  @ViewChild('statusTpl', { static: true }) statusTpl!: TemplateRef<{ $implicit: PayoutRow; row: PayoutRow; index: number }>;
  @ViewChild('createdAtTpl', { static: true }) createdAtTpl!: TemplateRef<{ $implicit: PayoutRow; row: PayoutRow; index: number }>;

  readonly PayoutMethod = PayoutMethod;
  readonly PayoutStatus = PayoutStatus;

  ngOnInit(): void {
    this.buildColumns();
    this.loadPayouts();
  }

  private buildColumns(): void {
    const stickyLeft: 'left' | undefined = this.isMobile() ? undefined : 'left';
    const stickyRight: 'right' | undefined = this.isMobile() ? undefined : 'right';
    this.columns = [
      { key: 'payoutNumber', header: 'Payout #', template: this.payoutNumberTpl, sortable: false, width: '170px', sticky: stickyLeft, stickyOffset: stickyLeft ? '0px' : undefined },
      { key: 'instructorId', header: 'Instructor ID', template: this.instructorIdTpl, sortable: false, width: '90px', align: 'left' },
      { key: 'totalAmount', header: 'Amount', template: this.amountTpl, sortable: false, width: '110px' },
      { key: 'earningsCount', header: 'Earnings', template: this.earningsCountTpl, sortable: false, width: '100px' },
      { key: 'paymentMethod', header: 'Payment Method', template: this.methodTpl, sortable: false, width: '150px' },
      { key: 'status', header: 'Status', template: this.statusTpl, sortable: false, width: '200px' },
      { key: 'createdAt', header: 'Created At', template: this.createdAtTpl, sortable: false, width: '130px' },
    ];
    this.actionsSticky.set(stickyRight);
  }

  loadPayouts(): void {
    this.async.execute(
      this.payoutService.getPendingPayouts({
        page: this.currentPage() - 1,
        size: this.pageSize,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
      {
        errorMsg: 'Failed to load pending payouts',
        onSuccess: (response) => {
          this.pagination.applyPagedResponse(response, (items) => this.payouts.set(items));
        },
      },
    );
  }

  openProcessModal(payout: PayoutRow): void {
    this.modalErrorMessage.set('');
    this.selectedPayout.set(payout);
    this.processModal.open(payout);
  }

  openConfirmManualModal(payout: PayoutRow): void {
    this.modalErrorMessage.set('');
    this.selectedPayout.set(payout);
    this.bankTransferReference = '';
    this.confirmManualModal.open(payout);
  }

  openEditRecipientModal(payout: PayoutRow): void {
    this.modalErrorMessage.set('');
    this.selectedPayout.set(payout);
    this.paymentMethod = payout.paymentMethod;
    this.bankAccount = payout.bankAccount ?? '';
    this.bankName = payout.bankName ?? '';
    this.accountHolderName = payout.accountHolderName ?? '';
    this.swiftCode = payout.swiftCode ?? '';
    this.bankAddress = payout.bankAddress ?? '';
    this.paypalEmail = payout.paypalEmail ?? '';
    this.editRecipientModal.open(payout);
  }

  processPayout(): void {
    const payout = this.selectedPayout();
    if (!payout) return;

    this.async.execute(this.payoutService.processPayout(payout.id), {
      submitting: true,
      successMsg: 'Payout processed successfully',
      errorMsg: 'Failed to process payout',
      errorTarget: this.modalErrorMessage,
      onSuccess: () => {
        this.processModal.close();
        this.loadPayouts();
      },
    });
  }

  confirmManualPayout(): void {
    const payout = this.selectedPayout();
    if (!payout || !this.bankTransferReference.trim()) return;

    this.async.execute(this.payoutService.confirmManualPayout(payout.id, this.bankTransferReference), {
      submitting: true,
      successMsg: 'Manual payout confirmed successfully',
      errorMsg: 'Failed to confirm manual payout',
      errorTarget: this.modalErrorMessage,
      onSuccess: () => {
        this.confirmManualModal.close();
        this.loadPayouts();
      },
    });
  }

  updateRecipient(): void {
    const payout = this.selectedPayout();
    if (!payout) return;

    const method = this.paymentMethod;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { paymentMethod: method };

    if (method === PayoutMethod.BANK_TRANSFER) {
      if (!this.bankAccount.trim()) { this.modalErrorMessage.set('Bank account is required'); return; }
      if (!this.bankName.trim()) { this.modalErrorMessage.set('Bank name is required'); return; }
      if (!this.accountHolderName.trim()) { this.modalErrorMessage.set('Account holder name is required'); return; }
      data.bankAccount = this.bankAccount;
      data.bankName = this.bankName;
      data.accountHolderName = this.accountHolderName;
      data.swiftCode = this.swiftCode?.trim() || undefined;
      data.bankAddress = this.bankAddress?.trim() || undefined;
    } else if (method === PayoutMethod.PAYPAL) {
      if (!this.paypalEmail.trim()) { this.modalErrorMessage.set('PayPal email is required'); return; }
      data.paypalEmail = this.paypalEmail;
    }

    this.async.execute(this.payoutService.updatePayoutRecipient(payout.id, data), {
      submitting: true,
      successMsg: 'Recipient information updated successfully',
      errorMsg: 'Failed to update recipient information',
      errorTarget: this.modalErrorMessage,
      onSuccess: () => {
        this.editRecipientModal.close();
        this.loadPayouts();
      },
    });
  }

  onPageChange(page: number): void {
    this.pagination.goToPage(page);
    this.loadPayouts();
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getStatusVariant(status: string): 'warning' | 'info' | 'success' | 'error' | 'primary' {
    if (status === PayoutStatus.PENDING) return 'warning';
    if (status === PayoutStatus.PROCESSING) return 'info';
    if (status === PayoutStatus.AWAITING_MANUAL_PAYOUT) return 'primary';
    if (status === PayoutStatus.COMPLETED) return 'success';
    if (status === PayoutStatus.FAILED) return 'error';
    return 'warning';
  }

  getStatusLabel(status: string): string {
    if (status === PayoutStatus.AWAITING_MANUAL_PAYOUT) return 'Awaiting Manual Transfer';
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  getMethodLabel(method: string): string {
    return method === PayoutMethod.BANK_TRANSFER ? 'Bank Transfer'
      : method === PayoutMethod.PAYPAL ? 'PayPal'
        : method;
  }
}
