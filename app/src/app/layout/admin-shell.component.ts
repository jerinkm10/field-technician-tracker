import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';

import { appSettings } from '../core/config/app.settings';
import { AuthService } from '../core/services/auth.service';
import { NotificationsApiService } from '../core/services/notifications-api.service';
import { RealtimeService } from '../core/services/realtime.service';
import {
  NotificationRecord,
  NotificationReferenceType,
} from '../shared/models/billing.models';

type NavigationItem = {
  readonly label: string;
  readonly icon: string;
  readonly route?: string;
  readonly children?: readonly NavigationItem[];
};

type TagSeverity = 'success' | 'warn';
type NavigationGroupState = Record<string, boolean>;

const NAVIGATION_STATE_KEY = 'field-technician-tracker.admin-shell.groups';

@Component({
  selector: 'app-admin-shell',
  imports: [
    ButtonModule,
    DatePipe,
    DividerModule,
    DialogModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TagModule
  ],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminShellComponent {
  protected readonly navigation: readonly NavigationItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'pi pi-home' },
    {
      label: 'Tracking',
      icon: 'pi pi-map',
      children: [
        {
          label: 'Live Map',
          route: '/live-map',
          icon: 'pi pi-map-marker',
        },
      ],
    },
    {
      label: 'Operations',
      icon: 'pi pi-briefcase',
      children: [
        {
          label: 'Jobs',
          route: '/jobs',
          icon: 'pi pi-briefcase',
        },
        {
          label: 'Technicians',
          route: '/technicians',
          icon: 'pi pi-wrench',
        },
        {
          label: 'Reports',
          route: '/reports',
          icon: 'pi pi-chart-bar',
        },
      ],
    },
    {
      label: 'Invoice',
      icon: 'pi pi-receipt',
      children: [
        {
          label: 'Proforma Invoice',
          route: '/invoice/proforma',
          icon: 'pi pi-file',
        },
        {
          label: 'Tax Invoice',
          route: '/invoice/tax',
          icon: 'pi pi-file-check',
        },
        {
          label: 'Quotation',
          route: '/invoice/quotation',
          icon: 'pi pi-file-edit',
        },
        {
          label: 'Customers',
          route: '/invoice/customers',
          icon: 'pi pi-id-card',
        },
        {
          label: 'Invoice Input Fields',
          route: '/invoice/input-fields',
          icon: 'pi pi-sliders-h',
        },
      ],
    },
    {
      label: 'Business',
      icon: 'pi pi-briefcase',
      children: [
        {
          label: 'Outstanding',
          route: '/business/outstanding',
          icon: 'pi pi-wallet',
        },
        {
          label: 'AMC',
          route: '/business/amc',
          icon: 'pi pi-calendar',
        },
        {
          label: 'Ledger',
          route: '/business/ledger',
          icon: 'pi pi-book',
        },
        {
          label: 'Lead',
          route: '/business/lead',
          icon: 'pi pi-megaphone',
        },
        {
          label: 'Product and Service',
          route: '/business/product-service',
          icon: 'pi pi-box',
        },
        {
          label: 'Complaints Registrations',
          route: '/business/complaints',
          icon: 'pi pi-exclamation-circle',
        },
        {
          label: 'Employee Tasks',
          route: '/business/tasks',
          icon: 'pi pi-list-check',
        },
      ],
    },
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      children: [
        {
          label: 'Company',
          route: '/settings/company',
          icon: 'pi pi-building-columns',
        },
        {
          label: 'Branch',
          route: '/settings/branch',
          icon: 'pi pi-building',
        },
        {
          label: 'Employees',
          route: '/settings/employees',
          icon: 'pi pi-users',
        },
      ],
    },
  ];

  private readonly router = inject(Router);
  private readonly notificationsApiService = inject(NotificationsApiService);

  protected readonly primaryNavigation = this.navigation.filter(
    (item) => item.route,
  );
  protected readonly groupedNavigation = this.navigation.filter(
    (item) => item.children?.length,
  );

  protected readonly sidebarOpen = signal(false);
  protected readonly expandedGroups = signal<NavigationGroupState>({});
  protected readonly authService = inject(AuthService);
  protected readonly realtime = inject(RealtimeService);
  protected readonly appName = appSettings.appName;
  protected readonly notifications = signal<NotificationRecord[]>([]);
  protected readonly unreadNotifications = signal(0);
  protected readonly notificationsLoading = signal(false);
  protected readonly notificationsVisible = signal(false);

  constructor() {
    this.expandedGroups.set(this.restoreExpandedGroups());
    this.syncActiveGroups();
    this.realtime.connect();
    this.loadNotifications();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.syncActiveGroups();
      }
    });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((isOpen) => !isOpen);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected logout(): void {
    this.closeSidebar();
    this.authService.logout();
  }

  protected connectionSeverity(): TagSeverity {
    return this.realtime.connected() ? 'success' : 'warn';
  }

  protected canViewNavigationItem(item: NavigationItem): boolean {
    const role = this.authService.currentUser()?.role;

    if (item.route === '/dashboard') {
      return this.authService.hasShellAccess(role);
    }

    if (
      item.route?.startsWith('/invoice') ||
      item.route === '/jobs' ||
      item.route === '/technicians' ||
      item.route === '/reports' ||
      item.route === '/live-map' ||
      item.route === '/business/product-service' ||
      item.route?.startsWith('/settings')
    ) {
      return this.authService.hasDashboardAccess(role);
    }

    if (item.route === '/business/ledger') {
      return this.authService.canViewLedger();
    }

    return true;
  }

  protected visibleGroupChildren(group: NavigationItem): readonly NavigationItem[] {
    return (group.children ?? []).filter((item) => this.canViewNavigationItem(item));
  }

  protected isGroupActive(items: readonly NavigationItem[]): boolean {
    return items.some((item) => (item.route ? this.isRouteActive(item.route) : false));
  }

  protected toggleGroup(groupLabel: string): void {
    const nextState = {
      ...this.expandedGroups(),
      [groupLabel]: !this.isGroupExpanded(groupLabel),
    };

    this.expandedGroups.set(nextState);
    this.persistExpandedGroups(nextState);
  }

  protected isGroupExpanded(groupLabel: string): boolean {
    return this.expandedGroups()[groupLabel] ?? false;
  }

  protected openNotifications(): void {
    this.notificationsVisible.set(true);
    this.loadNotifications();
  }

  protected closeNotifications(): void {
    this.notificationsVisible.set(false);
  }

  protected markNotificationRead(notification: NotificationRecord): void {
    if (notification.isRead) {
      return;
    }

    this.notificationsApiService.markAsRead(notification.id).subscribe({
      next: () => {
        this.notifications.update((items) =>
          items.map((item) =>
            item.id === notification.id ? { ...item, isRead: true } : item,
          ),
        );
        this.unreadNotifications.update((count) => Math.max(0, count - 1));
      },
    });
  }

  protected markAllNotificationsRead(): void {
    this.notificationsApiService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((items) =>
          items.map((item) => ({ ...item, isRead: true })),
        );
        this.unreadNotifications.set(0);
      },
    });
  }

  protected notificationsLabel(): string {
    const unread = this.unreadNotifications();
    return unread > 0 ? `Notifications (${unread})` : 'Notifications';
  }

  protected notificationsSummaryLabel(): string {
    const total = this.notifications().length;
    const unread = this.unreadNotifications();

    if (total === 0) {
      return 'No recent updates are waiting in your inbox.';
    }

    if (unread === 0) {
      return `${total} update(s) available. Everything has already been reviewed.`;
    }

    return `${total} update(s) available with ${unread} unread item(s) needing attention.`;
  }

  protected notificationTypeLabel(referenceType: NotificationReferenceType): string {
    switch (referenceType) {
      case 'AMC':
        return 'AMC';
      case 'COMPLAINT':
        return 'Complaint';
      case 'JOB':
        return 'Job';
      case 'LEAD':
        return 'Lead';
      case 'OUTSTANDING':
        return 'Outstanding';
      case 'TASK':
        return 'Task';
      default:
        return 'Update';
    }
  }

  protected notificationTone(
    referenceType: NotificationReferenceType,
  ): 'teal' | 'blue' | 'amber' | 'rose' | 'slate' {
    switch (referenceType) {
      case 'AMC':
        return 'blue';
      case 'COMPLAINT':
        return 'rose';
      case 'JOB':
        return 'teal';
      case 'LEAD':
        return 'amber';
      case 'OUTSTANDING':
        return 'slate';
      case 'TASK':
      default:
        return 'blue';
    }
  }

  protected notificationIcon(referenceType: NotificationReferenceType): string {
    switch (referenceType) {
      case 'AMC':
        return 'pi pi-calendar';
      case 'COMPLAINT':
        return 'pi pi-exclamation-circle';
      case 'JOB':
        return 'pi pi-briefcase';
      case 'LEAD':
        return 'pi pi-megaphone';
      case 'OUTSTANDING':
        return 'pi pi-wallet';
      case 'TASK':
      default:
        return 'pi pi-list-check';
    }
  }

  protected shellTitle(): string {
    return this.authService.isAdmin()
      ? 'Operations Dashboard'
      : 'Employee Dashboard';
  }

  private isRouteActive(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(`${route}/`);
  }

  private syncActiveGroups(): void {
    const nextState = { ...this.expandedGroups() };
    let updated = false;

    for (const group of this.groupedNavigation) {
      if (
        this.isGroupActive(this.visibleGroupChildren(group)) &&
        !nextState[group.label]
      ) {
        nextState[group.label] = true;
        updated = true;
      }
    }

    if (updated) {
      this.expandedGroups.set(nextState);
      this.persistExpandedGroups(nextState);
    }
  }

  private restoreExpandedGroups(): NavigationGroupState {
    if (typeof window === 'undefined') {
      return {};
    }

    const rawState = window.localStorage.getItem(NAVIGATION_STATE_KEY);
    if (!rawState) {
      return {};
    }

    try {
      const parsed = JSON.parse(rawState) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
      );
    } catch {
      return {};
    }
  }

  private persistExpandedGroups(state: NavigationGroupState): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state));
  }

  private loadNotifications(): void {
    this.notificationsLoading.set(true);

    this.notificationsApiService
      .getNotifications({ limit: 12, page: 1 })
      .subscribe({
        next: (response) => {
          this.notifications.set(response.data);
          this.unreadNotifications.set(response.unreadCount);
          this.notificationsLoading.set(false);
        },
        error: () => {
          this.notifications.set([]);
          this.unreadNotifications.set(0);
          this.notificationsLoading.set(false);
        },
      });
  }
}
