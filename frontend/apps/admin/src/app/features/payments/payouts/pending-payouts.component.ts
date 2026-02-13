import { Component, OnInit, TemplateRef, ViewChild, inject, signal, computed } from '@angular/core';
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
import {
  PayoutResponse,
} from '@edumind/shared-types';
import { PayoutMethod, PayoutStatus } from '@edumind/shared-constants';
import {
  AdminPayoutService
} from '../../../core/services/admin-payout.service';

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

  // State (signals)
  payouts = signal<PayoutRow[]>([]);
  isLoading = signal(true);
  currentPage = signal(1);
  totalItems = signal(0);
  pageSize = 10;

  // Table columns
  columns: TableColumn<PayoutRow>[] = [];
  actionsSticky = signal<'left' | 'right' | undefined>('right');

  // Templates
  @ViewChild('payoutNumberTpl', { static: true })
  payoutNumberTpl!: TemplateRef<{ $implicit: PayoutRow; row: PayoutRow; index: number }>;
  @ViewChild('instructorIdTpl', { static: true })
  instructorIdTpl!: TemplateRef<{ $implicit: PayoutRow; row: PayoutRow; index: number }>;
  @ViewChild('amountTpl', { static: true })
  amountTpl!: TemplateRef<{ $implicit: PayoutRow; row: PayoutRow; index: number }>;
  @ViewChild('methodTpl', { static: true })
  methodTpl!: TemplateRef<{ $implicit: PayoutRow; row: PayoutRow; index: number }>;
  @ViewChild('earningsCountTpl', { static: true })
  earningsCountTpl!: TemplateRef<{ $implicit: PayoutRow; row: PayoutRow; index: number }>;
  @ViewChild('statusTpl', { static: true })
  statusTpl!: TemplateRef<{ $implicit: PayoutRow; row: PayoutRow; index: number }>;
  @ViewChild('createdAtTpl', { static: true })
  createdAtTpl!: TemplateRef<{ $implicit: PayoutRow; row: PayoutRow; index: number }>;

  // Modals
  showProcessModal = signal(false);
  showEditRecipientModal = signal(false);
  showConfirmManualModal = signal(false);
  selectedPayout = signal<PayoutRow | null>(null);

  // Form state
  paymentMethod = '';
  bankAccount = '';
  bankName = '';
  accountHolderName = '';
  swiftCode = '';
  bankAddress = '';
  paypalEmail = '';
  bankTransferReference = '';

  // Messages
  successMessage = signal('');
  errorMessage = signal('');

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize));

  readonly PayoutMethod = PayoutMethod;
  readonly PayoutStatus = PayoutStatus;

  ngOnInit(): void {
    this.buildColumns();
    this.loadPayouts();
  }

  private buildColumns(): void {
    this.columns = [
      {
        key: 'payoutNumber',
        header: 'Payout #',
        template: this.payoutNumberTpl,
        sortable: true,
        width: '170px',
        sticky: 'left',
        stickyOffset: '0px',
      },
      {
        key: 'instructorId',
        header: 'Instructor ID',
        template: this.instructorIdTpl,
        sortable: true,
        width: '90px',
        align: 'left',
      },
      {
        key: 'totalAmount',
        header: 'Amount',
        template: this.amountTpl,
        sortable: true,
        width: '110px',
      },
      {
        key: 'earningsCount',
        header: 'Earnings',
        template: this.earningsCountTpl,
        sortable: true,
        width: '100px',
      },
      {
        key: 'paymentMethod',
        header: 'Payment Method',
        template: this.methodTpl,
        sortable: true,
        width: '150px',
      },
      {
        key: 'status',
        header: 'Status',
        template: this.statusTpl,
        sortable: true,
        width: '200px',
      },
      {
        key: 'createdAt',
        header: 'Created At',
        template: this.createdAtTpl,
        sortable: true,
        width: '130px',
      },
    ];
  }

  loadPayouts(): void {
    this.isLoading.set(true);
    this.payoutService.getPendingPayouts({
      page: this.currentPage() - 1,
      size: this.pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }).subscribe({
      next: (response) => {
        this.payouts.set(response.data ?? []);
        this.totalItems.set(response.pagination?.totalElements ?? 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load pending payouts');
        this.isLoading.set(false);
      },
    });
  }

  openProcessModal(payout: PayoutRow): void {
    this.selectedPayout.set(payout);
    this.showProcessModal.set(true);
  }

  openConfirmManualModal(payout: PayoutRow): void {
    this.selectedPayout.set(payout);
    this.bankTransferReference = '';
    this.showConfirmManualModal.set(true);
  }

  openEditRecipientModal(payout: PayoutRow): void {
    this.selectedPayout.set(payout);
    this.paymentMethod = payout.paymentMethod;
    this.bankAccount = payout.bankAccount ?? '';
    this.bankName = payout.bankName ?? '';
    this.accountHolderName = payout.accountHolderName ?? '';
    this.swiftCode = payout.swiftCode ?? '';
    this.bankAddress = payout.bankAddress ?? '';
    this.paypalEmail = payout.paypalEmail ?? '';
    this.showEditRecipientModal.set(true);
  }

  processPayout(): void {
    const payout = this.selectedPayout();
    if (!payout) return;

    this.payoutService.processPayout(payout.id).subscribe({
      next: () => {
        this.successMessage.set('Payout processed successfully');
        this.showProcessModal.set(false);
        this.loadPayouts();
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: () => {
        this.errorMessage.set('Failed to process payout');
        setTimeout(() => this.errorMessage.set(''), 5000);
      },
    });
  }

  confirmManualPayout(): void {
    const payout = this.selectedPayout();
    if (!payout || !this.bankTransferReference.trim()) return;

    this.payoutService.confirmManualPayout(payout.id, this.bankTransferReference).subscribe({
      next: () => {
        this.successMessage.set('Manual payout confirmed successfully');
        this.showConfirmManualModal.set(false);
        this.loadPayouts();
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: () => {
        this.errorMessage.set('Failed to confirm manual payout');
        setTimeout(() => this.errorMessage.set(''), 5000);
      },
    });
  }

  updateRecipient(): void {
    const payout = this.selectedPayout();
    if (!payout) return;

    const method = this.paymentMethod;
    const data: any = {
      paymentMethod: method,
    };

    if (method === PayoutMethod.BANK_TRANSFER) {
      if (!this.bankAccount.trim()) {
        this.errorMessage.set('Bank account is required');
        setTimeout(() => this.errorMessage.set(''), 5000);
        return;
      }
      if (!this.bankName.trim()) {
        this.errorMessage.set('Bank name is required');
        setTimeout(() => this.errorMessage.set(''), 5000);
        return;
      }
      if (!this.accountHolderName.trim()) {
        this.errorMessage.set('Account holder name is required');
        setTimeout(() => this.errorMessage.set(''), 5000);
        return;
      }
      data.bankAccount = this.bankAccount;
      data.bankName = this.bankName;
      data.accountHolderName = this.accountHolderName;
      data.swiftCode = this.swiftCode?.trim() ? this.swiftCode.trim() : undefined;
      data.bankAddress = this.bankAddress?.trim() ? this.bankAddress.trim() : undefined;
    } else if (method === PayoutMethod.PAYPAL) {
      if (!this.paypalEmail.trim()) {
        this.errorMessage.set('PayPal email is required');
        setTimeout(() => this.errorMessage.set(''), 5000);
        return;
      }
      data.paypalEmail = this.paypalEmail;
    }

    this.payoutService.updatePayoutRecipient(payout.id, data).subscribe({
      next: () => {
        this.successMessage.set('Recipient information updated successfully');
        this.showEditRecipientModal.set(false);
        this.loadPayouts();
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: () => {
        this.errorMessage.set('Failed to update recipient information');
        setTimeout(() => this.errorMessage.set(''), 5000);
      },
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadPayouts();
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
    return method === PayoutMethod.BANK_TRANSFER ? 'Bank Transfer' : method === PayoutMethod.PAYPAL ? 'PayPal' : method;
  }

}
