import {
  HttpInterceptorFn,
  HttpResponse,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { map, catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { unwrapApiResponse } from '@edumind/shared-utils';
import {
  AuthService,
  isAdminPortalIdentityRejectedError,
  isTerminalRefreshFailure,
} from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Skip auth header for auth endpoints
  const isAuthEndpoint =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh');

  // Clone request with credentials (for cookies) and auth header
  let request = req.clone({
    withCredentials: true, // IMPORTANT: Send cookies with every request
  });

  // Add auth header if not auth endpoint
  const token = authService.getToken();
  if (token && !isAuthEndpoint) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(request).pipe(
    // Transform response - unwrap API response
    map((event) => {
      if (event instanceof HttpResponse) {
        const transformedBody = unwrapApiResponse(event.body);
        if (transformedBody !== event.body) {
          return event.clone({ body: transformedBody });
        }
      }
      return event;
    }),

    // Handle errors - refresh token on 401
    catchError((error: HttpErrorResponse) => {
      // Only try refresh for 401 errors on non-auth endpoints
      if (error.status === 401 && !isAuthEndpoint) {
        return handleUnauthorizedError(request, next, authService);
      }

      return throwError(() => error);
    })
  );
};

/**
 * Handle 401 Unauthorized error
 * Try to refresh token and retry the original request.
 *
 * authService.refreshToken() owns the shared refresh pipeline - concurrent
 * callers (this interceptor, boot reconcile, focus reconcile) all subscribe
 * to the same in-flight request and get the same result, so no separate
 * coordination state is kept here.
 */
function handleUnauthorizedError(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
) {
  return authService.refreshToken().pipe(
    switchMap((response) => {
      // Retry original request with new token
      const retryRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${response.accessToken}`,
        },
      });

      return next(retryRequest).pipe(
        map((event) => {
          if (event instanceof HttpResponse) {
            const transformedBody = unwrapApiResponse(event.body);
            if (transformedBody !== event.body) {
              return event.clone({ body: transformedBody });
            }
          }
          return event;
        })
      );
    }),
    catchError((refreshErr) => {
      // Three-way classification, by type/errorCode - never by bare HTTP
      // status, since a wrong-portal rejection and a dead session can both
      // arrive as 403/401.
      if (isAdminPortalIdentityRejectedError(refreshErr)) {
        // Confirmed wrong-portal identity - reject it locally instead of the
        // blanket forceLogout(), which would revoke every device via
        // /auth/logout semantics.
        authService.rejectPortalIdentity(refreshErr.rejectedUser);
      } else if (isTerminalRefreshFailure(refreshErr)) {
        // Refresh token itself is confirmed dead/revoked - only this branch
        // may force a logout.
        authService.forceLogout();
      } else {
        // Network error, timeout, 5xx, malformed body, or a schema contract
        // violation (e.g. missing user) - none of these prove the session is
        // dead. Keep the stored snapshot and let the caller retry.
        authService.markTemporaryReconcileFailure();
      }

      return throwError(() => refreshErr);
    })
  );
}