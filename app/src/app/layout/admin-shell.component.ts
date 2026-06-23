import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';

import { appSettings } from '../core/config/app.settings';
import { AuthService } from '../core/services/auth.service';
import { RealtimeService } from '../core/services/realtime.service';

type NavigationItem = {
  readonly label: string;
  readonly icon: string;
  readonly route?: string;
  readonly children?: readonly NavigationItem[];
};

type TagSeverity = 'success' | 'warn';

@Component({
  selector: 'app-admin-shell',
  imports: [
    AvatarModule,
    ButtonModule,
    DividerModule,
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
    { label: 'Live Map', route: '/live-map', icon: 'pi pi-map' },
    { label: 'Jobs', route: '/jobs', icon: 'pi pi-briefcase' },
    { label: 'Technicians', route: '/technicians', icon: 'pi pi-users' },
    { label: 'Reports', route: '/reports', icon: 'pi pi-chart-line' },
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
          label: 'Suppliers',
          route: '/invoice/suppliers',
          icon: 'pi pi-building',
        },
        {
          label: 'Invoice Input Fields',
          route: '/invoice/input-fields',
          icon: 'pi pi-sliders-h',
        },
      ],
    },
  ];

  private readonly router = inject(Router);

  protected readonly primaryNavigation = this.navigation.filter(
    (item) => item.route,
  );
  protected readonly groupedNavigation = this.navigation.filter(
    (item) => item.children?.length,
  );

  protected readonly invoiceNavigation = this.groupedNavigation[0]?.children ?? [];

  protected readonly sidebarOpen = signal(false);
  protected readonly authService = inject(AuthService);
  protected readonly realtime = inject(RealtimeService);
  protected readonly appName = appSettings.appName;

  constructor() {
    this.realtime.connect();
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

  protected isGroupActive(items: readonly NavigationItem[]): boolean {
    return items.some((item) => (item.route ? this.isRouteActive(item.route) : false));
  }

  private isRouteActive(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(`${route}/`);
  }
}
