import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@admin/core/services/auth.service';
import {
  ButtonComponent,
  InputComponent,
  AlertComponent,
} from '@edumind/admin-ui';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    AlertComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword = signal(false);
  successMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      usernameOrEmail: ['', [Validators.required, Validators.minLength(3)]], // ✅ FIXED
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get isLoading() {
    return this.authService.isLoading();
  }

  get error() {
    return this.authService.error();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.authService.clearError();
    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.successMessage.set('Login successful! Redirecting...');
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1000);
      },
      error: (error) => {
        console.error('Login error:', error);
      },
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.loginForm.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return fieldName === 'usernameOrEmail' 
        ? 'Username or email is required'
        : 'Password is required';
    }
    if (control.errors['minlength']) {
      const requiredLength = control.errors['minlength'].requiredLength;
      return fieldName === 'usernameOrEmail'
        ? `Username/email must be at least ${requiredLength} characters`
        : `Password must be at least ${requiredLength} characters`;
    }
    return '';
  }

  closeSuccessMessage(): void {
    this.successMessage.set('');
  }

  closeError(): void {
    this.authService.clearError();
  }
}