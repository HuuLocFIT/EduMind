import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { unwrapApiResponse } from '@edumind/shared-utils';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const isAuthEndpoint =
    req.url.includes('/auth/login') || req.url.includes('/auth/register');

  const request =
    token && !isAuthEndpoint
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : req;

  return next(request).pipe(
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
};