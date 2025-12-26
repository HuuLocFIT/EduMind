import {
  HttpInterceptorFn,
  HttpResponse,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { map, catchError, switchMap } from 'rxjs/operators';
import { throwError, Subject, take } from 'rxjs';
import { unwrapApiResponse } from '@edumind/shared-utils';
import { AuthService } from '../services/auth.service';

// Track refresh state across interceptor calls
let isRefreshing = false;
let refreshTokenSubject = new Subject<string>();

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
 * Try to refresh token and retry the original request
 */
function handleUnauthorizedError(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
) {
  if (!isRefreshing) {
    isRefreshing = true;
    // Create new Subject for this refresh cycle
    refreshTokenSubject = new Subject<string>();

    return authService.refreshToken().pipe(
      switchMap((response) => {
        isRefreshing = false;
        refreshTokenSubject.next(response.accessToken);
        refreshTokenSubject.complete();

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
        isRefreshing = false;
        // Propagate error to all queued requests
        refreshTokenSubject.error(refreshErr);

        // Refresh failed - force logout
        authService.forceLogout();

        return throwError(() => refreshErr);
      })
    );
  } else {
    // Another request is already refreshing - wait for it
    return refreshTokenSubject.pipe(
      take(1),
      switchMap((token) => {
        // Retry with the new token from the other request's refresh
        const retryRequest = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
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
      })
    );
  }
}