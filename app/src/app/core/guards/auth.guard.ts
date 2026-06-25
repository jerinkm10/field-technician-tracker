import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { UiFeedbackService } from '../services/ui-feedback.service';

function redirectToLogin(returnUrl: string) {
  const router = inject(Router);

  return router.createUrlTree(['/login'], {
    queryParams: returnUrl && returnUrl !== '/login' ? { returnUrl } : undefined,
  });
}

export const adminAuthGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const uiFeedback = inject(UiFeedbackService);

  if (authService.isAuthenticated() && authService.isAdmin()) {
    return true;
  }

  if (authService.isAuthenticated() && !authService.isAdmin()) {
    uiFeedback.showPermissionDenied(
      'Admin access is required to open High Cooling Solution.',
    );
    authService.logout({ navigate: false });
  }

  return redirectToLogin(state.url);
};

export const adminChildAuthGuard: CanActivateChildFn = (_route, state) => {
  const authService = inject(AuthService);

  if (authService.isAuthenticated() && authService.isAdmin()) {
    return true;
  }

  return redirectToLogin(state.url);
};

export const loginPageGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.isAdmin()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
