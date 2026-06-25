import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { UiFeedbackService } from '../services/ui-feedback.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const uiFeedback = inject(UiFeedbackService);
  const accessToken = authService.accessToken();
  const authenticatedRequest = accessToken
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLoginRequest = request.url.endsWith('/auth/login');

      if (error.status === 401 && !isLoginRequest) {
        uiFeedback.warn(
          'Session expired',
          'Please sign in again to continue using High Cooling Solution.',
        );
        authService.logout();
      }

      if (error.status === 403) {
        uiFeedback.showPermissionDenied(
          'Your account does not have access to this section.',
        );
      }

      return throwError(() => error);
    }),
  );
};
