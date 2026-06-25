import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import { AppUserRole } from '../../shared/models/billing.models';
import { RealtimeService } from './realtime.service';

export type AuthenticatedUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: AppUserRole;
};

export type LoginRequest = {
  username?: string;
  email?: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthenticatedUser;
};

type JwtPayload = {
  sub?: string;
  name?: string;
  username?: string;
  email?: string | null;
  role?: AppUserRole;
  exp?: number;
};

const ACCESS_TOKEN_KEY = 'accessToken';
const CURRENT_USER_KEY = 'currentUser';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly realtimeService = inject(RealtimeService);

  private readonly accessTokenState = signal<string | null>(this.readAccessToken());
  private readonly currentUserState = signal<AuthenticatedUser | null>(this.readCurrentUser());

  readonly accessToken = computed(() => this.accessTokenState());
  readonly currentUser = computed(() => this.currentUserState());
  readonly isAuthenticated = computed(
    () => Boolean(this.accessTokenState()) && Boolean(this.currentUserState()),
  );
  readonly isAdmin = computed(
    () => this.isAuthenticated() && this.hasDashboardAccess(this.currentUserState()?.role),
  );
  readonly canViewLedger = computed(
    () => this.isAuthenticated() && this.hasLedgerAccess(this.currentUserState()?.role),
  );

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.httpClient.post<LoginResponse>(`${appSettings.apiBaseUrl}/auth/login`, payload);
  }

  hasDashboardAccess(role: AppUserRole | null | undefined): boolean {
    return role === 'ADMIN' || role === 'ADMIN_OWNER';
  }

  hasLedgerAccess(role: AppUserRole | null | undefined): boolean {
    return role === 'ADMIN' || role === 'ADMIN_OWNER';
  }

  startSession(response: LoginResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(response.user));
    this.accessTokenState.set(response.accessToken);
    this.currentUserState.set(response.user);
  }

  logout(options?: { navigate?: boolean }): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    this.accessTokenState.set(null);
    this.currentUserState.set(null);
    this.realtimeService.disconnect();

    if (options?.navigate === false) {
      return;
    }

    void this.router.navigate(['/login']);
  }

  private readAccessToken(): string | null {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const payload = this.decodeJwtPayload(accessToken);

    if (!accessToken || !payload?.exp) {
      return accessToken;
    }

    const expiresAtMilliseconds = payload.exp * 1000;
    if (expiresAtMilliseconds > Date.now()) {
      return accessToken;
    }

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }

  private readCurrentUser(): AuthenticatedUser | null {
    const storedUser = localStorage.getItem(CURRENT_USER_KEY);

    if (storedUser) {
      try {
        return JSON.parse(storedUser) as AuthenticatedUser;
      } catch {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }

    const payload = this.decodeJwtPayload(this.readAccessToken());
    if (!payload?.sub || !payload.name || !payload.username || !payload.role) {
      return null;
    }

    return {
      id: payload.sub,
      name: payload.name,
      username: payload.username,
      email: payload.email ?? null,
      role: payload.role,
    };
  }

  private decodeJwtPayload(token: string | null): JwtPayload | null {
    if (!token) {
      return null;
    }

    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) {
      return null;
    }

    try {
      const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = atob(paddedBase64);
      return JSON.parse(json) as JwtPayload;
    } catch {
      return null;
    }
  }
}
