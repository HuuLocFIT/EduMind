import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ButtonComponent,
  InputComponent,
  AlertComponent,
  CardComponent,
  SelectComponent,
  SelectOption,
} from '@edumind/admin-ui';
import {
  CreatePayoutRequest,
} from '@edumind/shared-types';
import { PayoutMethod } from '@edumind/shared-constants';
import { AdminPayoutService } from '../../../core/services/admin-payout.service';
import { ADMIN_ROUTES } from '@edumind/shared-utils';

@Component({
  selector: 'app-create-payout',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    AlertComponent,
    CardComponent,
    SelectComponent,
  ],
  templateUrl: './create-payout.component.html',
})
export class CreatePayoutComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly payoutService = inject(AdminPayoutService);
  private readonly router = inject(Router);

  payoutForm!: FormGroup;
  successMessage = signal('');
  errorMessage = signal('');
  
  readonly PayoutMethod = PayoutMethod;
  readonly paymentMethodOptions: SelectOption[] = [
    { value: PayoutMethod.BANK_TRANSFER, label: 'Bank Transfer' },
    { value: PayoutMethod.PAYPAL, label: 'PayPal' },
  ];

  ngOnInit(): void {
    this.payoutForm = this.fb.group({
      instructorId: ['', [Validators.required, Validators.min(1)]],
      paymentMethod: [PayoutMethod.BANK_TRANSFER, [Validators.required]],
      bankAccount: [''],
      bankName: [''],
      accountHolderName: [''],
      swiftCode: [''],
      bankAddress: [''],
      paypalEmail: ['', [Validators.email]],
    });

    // Update validators based on payment method
    this.payoutForm.get('paymentMethod')?.valueChanges.subscribe((method) => {
      const bankAccountControl = this.payoutForm.get('bankAccount');
      const bankNameControl = this.payoutForm.get('bankName');
      const accountHolderNameControl = this.payoutForm.get('accountHolderName');
      const swiftCodeControl = this.payoutForm.get('swiftCode');
      const bankAddressControl = this.payoutForm.get('bankAddress');
      const paypalEmailControl = this.payoutForm.get('paypalEmail');

      if (method === PayoutMethod.BANK_TRANSFER) {
        bankAccountControl?.setValidators([Validators.required]);
        bankAccountControl?.updateValueAndValidity();
        bankNameControl?.setValidators([Validators.required]);
        bankNameControl?.updateValueAndValidity();
        accountHolderNameControl?.setValidators([Validators.required]);
        accountHolderNameControl?.updateValueAndValidity();
        swiftCodeControl?.clearValidators();
        swiftCodeControl?.updateValueAndValidity();
        bankAddressControl?.clearValidators();
        bankAddressControl?.updateValueAndValidity();
        paypalEmailControl?.clearValidators();
        paypalEmailControl?.updateValueAndValidity();
        paypalEmailControl?.setValue('');
      } else if (method === PayoutMethod.PAYPAL) {
        paypalEmailControl?.setValidators([Validators.required, Validators.email]);
        paypalEmailControl?.updateValueAndValidity();
        bankAccountControl?.clearValidators();
        bankAccountControl?.updateValueAndValidity();
        bankAccountControl?.setValue('');
        bankNameControl?.clearValidators();
        bankNameControl?.updateValueAndValidity();
        bankNameControl?.setValue('');
        accountHolderNameControl?.clearValidators();
        accountHolderNameControl?.updateValueAndValidity();
        accountHolderNameControl?.setValue('');
        swiftCodeControl?.clearValidators();
        swiftCodeControl?.updateValueAndValidity();
        swiftCodeControl?.setValue('');
        bankAddressControl?.clearValidators();
        bankAddressControl?.updateValueAndValidity();
        bankAddressControl?.setValue('');
      }
    });
  }

  onSubmit(): void {
    if (this.payoutForm.invalid) {
      this.payoutForm.markAllAsTouched();
      return;
    }

    const formValue = this.payoutForm.value;
    const data: CreatePayoutRequest = {
      instructorId: Number(formValue.instructorId),
      paymentMethod: formValue.paymentMethod,
      bankAccount: formValue.bankAccount || undefined,
      bankName: formValue.bankName || undefined,
      accountHolderName: formValue.accountHolderName || undefined,
      swiftCode: formValue.swiftCode || undefined,
      bankAddress: formValue.bankAddress || undefined,
      paypalEmail: formValue.paypalEmail || undefined,
    };

    this.payoutService.createPayout(data).subscribe({
      next: () => {
        this.successMessage.set('Payout created successfully');
        setTimeout(() => {
          this.router.navigate([ADMIN_ROUTES.PAYOUTS_ALL]);
        }, 1500);
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Failed to create payout');
        setTimeout(() => this.errorMessage.set(''), 5000);
      },
    });
  }

  onCancel(): void {
    this.router.navigate([ADMIN_ROUTES.PAYOUTS_ALL]);
  }

  getFieldError(fieldName: string): string {
    const control = this.payoutForm.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return `${fieldName} is required`;
    }
    if (control.errors['email']) {
      return 'Invalid email address';
    }
    if (control.errors['min']) {
      return 'Instructor ID must be greater than 0';
    }
    return '';
  }

  get paymentMethod(): string {
    return this.payoutForm.get('paymentMethod')?.value || PayoutMethod.BANK_TRANSFER;
  }
}
