import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';

import { appSettings } from '../../core/config/app.settings';
import { AuthService } from '../../core/services/auth.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

@Component({
  selector: 'app-login-page',
  imports: [ButtonModule, CardModule, FormsModule, InputTextModule, TagModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly uiFeedback = inject(UiFeedbackService);

  protected readonly appName = appSettings.appName;
  protected username = '';
  protected password = '';
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected login(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService
      .login({
        username: this.username.trim(),
        password: this.password,
      })
      .subscribe({
        next: async (response) => {
          if (!this.authService.hasDashboardAccess(response.user.role)) {
            this.loading.set(false);
            this.authService.logout({ navigate: false });
            const message =
              'This dashboard currently supports ADMIN_OWNER and ADMIN accounts only.';
            this.errorMessage.set(message);
            this.uiFeedback.showPermissionDenied(message);
            return;
          }

          this.authService.startSession(response);

          const returnUrl =
            this.activatedRoute.snapshot.queryParamMap.get('returnUrl') || '/dashboard';

          this.loading.set(false);
          await this.router.navigateByUrl(returnUrl);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          const apiMessage =
            typeof error.error?.message === 'string' ? error.error.message : null;
          const message =
            error.status === 401
              ? (apiMessage ?? 'Invalid username or password.')
              : 'Unable to sign in right now. Make sure the API is running on port 3007.';
          this.errorMessage.set(message);
          this.uiFeedback.error('Sign-in failed', message);
        },
      });
  }
}
