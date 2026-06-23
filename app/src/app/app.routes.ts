import { Routes } from '@angular/router';

import {
  adminAuthGuard,
  adminChildAuthGuard,
  loginPageGuard,
} from './core/guards/auth.guard';
import { AdminShellComponent } from './layout/admin-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginPageGuard],
    loadComponent: () =>
      import('./pages/login/login-page.component').then((module) => module.LoginPageComponent)
  },
  {
    path: '',
    component: AdminShellComponent,
    canActivate: [adminAuthGuard],
    canActivateChild: [adminChildAuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard-page.component').then(
            (module) => module.DashboardPageComponent
          )
      },
      {
        path: 'live-map',
        loadComponent: () =>
          import('./pages/live-map/live-map-page.component').then(
            (module) => module.LiveMapPageComponent
          )
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./pages/jobs/jobs-page.component').then((module) => module.JobsPageComponent)
      },
      {
        path: 'technicians',
        loadComponent: () =>
          import('./pages/technicians/technicians-page.component').then(
            (module) => module.TechniciansPageComponent
          )
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/reports/reports-page.component').then(
            (module) => module.ReportsPageComponent
          )
      },
      {
        path: 'invoice',
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'proforma'
          },
          {
            path: 'proforma',
            loadComponent: () =>
              import('./pages/invoice/proforma-invoice-page.component').then(
                (module) => module.ProformaInvoicePageComponent
              )
          },
          {
            path: 'tax',
            loadComponent: () =>
              import('./pages/invoice/tax-invoice-page.component').then(
                (module) => module.TaxInvoicePageComponent
              )
          },
          {
            path: 'suppliers',
            loadComponent: () =>
              import('./pages/invoice/suppliers-page.component').then(
                (module) => module.InvoiceSuppliersPageComponent
              )
          },
          {
            path: 'input-fields',
            loadComponent: () =>
              import('./pages/invoice/invoice-input-fields-page.component').then(
                (module) => module.InvoiceInputFieldsPageComponent
              )
          },
        ]
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
