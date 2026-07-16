import { inject } from '@angular/core';
import {
  CanActivateChildFn,
  CanActivateFn,
  Router,
} from '@angular/router';

import { AppUserRole } from '../../shared/models/billing.models';
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

  if (authService.isAuthenticated() && authService.canAccessShell()) {
    return true;
  }

  if (authService.isAuthenticated() && !authService.canAccessShell()) {
    uiFeedback.showPermissionDenied(
      'Admin or employee access is required to open High Cooling Solution.',
    );
    authService.logout({ navigate: false });
  }

  return redirectToLogin(state.url);
};

export const adminChildAuthGuard: CanActivateChildFn = (_route, state) => {
  const authService = inject(AuthService);

  if (authService.isAuthenticated() && authService.canAccessShell()) {
    return true;
  }

  return redirectToLogin(state.url);
};

export const roleAccessGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const uiFeedback = inject(UiFeedbackService);
  const allowedRoles = (route.data?.['roles'] as readonly AppUserRole[] | undefined) ?? [];
  const superAdminOnly = route.data?.['superAdminOnly'] === true;
  const currentRole = authService.currentUser()?.role;

  if (
    authService.isAuthenticated() &&
    authService.canAccessShell() &&
    (allowedRoles.length === 0 || authService.hasRole(allowedRoles, currentRole)) &&
    (!superAdminOnly || authService.isSuperAdmin())
  ) {
    return true;
  }

  uiFeedback.showPermissionDenied(
    superAdminOnly
      ? 'Only the super admin can open that page.'
      : 'You do not have permission to open that page.',
  );

  return router.createUrlTree(['/dashboard'], {
    queryParams:
      state.url && state.url !== '/dashboard'
        ? { deniedFrom: state.url }
        : undefined,
  });
};

export const ledgerAccessGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const uiFeedback = inject(UiFeedbackService);

  if (
    authService.isAuthenticated() &&
    authService.hasLedgerAccess(authService.currentUser()?.role)
  ) {
    return true;
  }

  uiFeedback.showPermissionDenied(
    'Only ADMIN_OWNER and ADMIN users can view the Ledger module.',
  );

  return router.createUrlTree(['/dashboard'], {
    queryParams:
      state.url && state.url !== '/dashboard'
        ? { deniedFrom: state.url }
        : undefined,
  });
};

export const loginPageGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.canAccessShell()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
