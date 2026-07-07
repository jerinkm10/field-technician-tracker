import { Injectable, inject } from '@angular/core';
import {
  ConfirmationService,
  MessageService,
} from 'primeng/api';

type ConfirmOptions = {
  message: string;
  header?: string;
  icon?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptButtonStyleClass?: string;
  rejectButtonStyleClass?: string;
  accept: () => void;
  reject?: () => void;
};

@Injectable({
  providedIn: 'root',
})
export class UiFeedbackService {
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  success(summary: string, detail?: string): void {
    this.messageService.add({
      severity: 'success',
      summary,
      detail,
      life: 3200,
    });
  }

  info(summary: string, detail?: string): void {
    this.messageService.add({
      severity: 'info',
      summary,
      detail,
      life: 3200,
    });
  }

  warn(summary: string, detail?: string): void {
    this.messageService.add({
      severity: 'warn',
      summary,
      detail,
      life: 4200,
    });
  }

  error(summary: string, detail?: string): void {
    this.messageService.add({
      severity: 'error',
      summary,
      detail,
      life: 5000,
    });
  }

  showPermissionDenied(
    detail = 'You do not have permission to complete this action.',
  ): void {
    this.warn('Permission denied', detail);
  }

  confirm(options: ConfirmOptions): void {
    this.confirmationService.confirm({
      header: options.header ?? 'Please confirm',
      message: options.message,
      icon: options.icon ?? 'pi pi-exclamation-triangle',
      acceptLabel: options.acceptLabel ?? 'Confirm',
      rejectLabel: options.rejectLabel ?? 'Cancel',
      acceptButtonStyleClass:
        options.acceptButtonStyleClass ?? 'p-button-danger',
      rejectButtonStyleClass:
        options.rejectButtonStyleClass ?? 'p-button-text',
      dismissableMask: false,
      closeOnEscape: true,
      closable: false,
      accept: options.accept,
      reject: options.reject,
    });
  }

  extractErrorMessage(error: unknown, fallback: string): string {
    const candidate = error as {
      error?: {
        message?: string | string[];
      };
      message?: string;
    };
    const message = candidate?.error?.message ?? candidate?.message;

    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ');
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return fallback;
  }
}
