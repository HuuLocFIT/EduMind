import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, timer } from 'rxjs';

export interface ExecuteOptions<T> {
  successMsg?: string;
  /** Fallback shown only when the backend response has no `message` field */
  errorMsg?: string;
  /** Use isSubmitting instead of isLoading (for mutation actions). Default: false */
  submitting?: boolean;
  /** Skip all loading-state toggling (fire-and-forget). Default: false */
  silent?: boolean;
  onSuccess?: (result: T) => void;
  onError?: (error: HttpErrorResponse) => void;
}

function extractErrorMessage(error: HttpErrorResponse, fallback?: string): string {
  if (typeof error?.error?.message === 'string' && error.error.message) {
    return error.error.message;
  }
  return fallback ?? 'Something went wrong. Please try again.';
}

export function injectAsyncState() {
  const destroyRef = inject(DestroyRef);

  const isLoading = signal(false);
  const isSubmitting = signal(false);
  const errorMessage = signal('');
  const successMessage = signal('');

  function execute<T>(obs: Observable<T>, opts: ExecuteOptions<T> = {}): void {
    const { successMsg, errorMsg, submitting = false, silent = false, onSuccess, onError } = opts;

    if (!silent) {
      if (submitting) {
        isSubmitting.set(true);
      } else {
        isLoading.set(true);
      }
    }

    obs.pipe(takeUntilDestroyed(destroyRef)).subscribe({
      next: (result) => {
        if (!silent) {
          if (submitting) {
            isSubmitting.set(false);
          } else {
            isLoading.set(false);
          }
        }
        if (successMsg) {
          successMessage.set(successMsg);
          timer(5000).pipe(takeUntilDestroyed(destroyRef)).subscribe(() => successMessage.set(''));
        }
        onSuccess?.(result);
      },
      error: (error: HttpErrorResponse) => {
        if (!silent) {
          if (submitting) {
            isSubmitting.set(false);
          } else {
            isLoading.set(false);
          }
        }
        if (!silent || errorMsg) {
          errorMessage.set(extractErrorMessage(error, errorMsg));
          timer(5000).pipe(takeUntilDestroyed(destroyRef)).subscribe(() => errorMessage.set(''));
        }
        onError?.(error);
      },
    });
  }

  return { isLoading, isSubmitting, errorMessage, successMessage, execute };
}
