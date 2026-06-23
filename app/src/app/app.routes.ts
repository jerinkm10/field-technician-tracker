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
              import('./pages/invoice/billing-document-list-page.component').then(
                (module) => module.BillingDocumentListPageComponent
              ),
            data: {
              kind: 'proforma',
            }
          },
          {
            path: 'proforma/create',
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'proforma',
              pageMode: 'create'
            }
          },
          {
            path: 'proforma/:id/view',
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'proforma',
              pageMode: 'view'
            }
          },
          {
            path: 'proforma/:id/edit',
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'proforma',
              pageMode: 'edit'
            }
          },
          {
            path: 'tax',
            loadComponent: () =>
              import('./pages/invoice/billing-document-list-page.component').then(
                (module) => module.BillingDocumentListPageComponent
              ),
            data: {
              kind: 'tax',
            }
          },
          {
            path: 'tax/create',
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'tax',
              pageMode: 'create'
            }
          },
          {
            path: 'tax/:id/view',
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'tax',
              pageMode: 'view'
            }
          },
          {
            path: 'tax/:id/edit',
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'tax',
              pageMode: 'edit'
            }
          },
          {
            path: 'quotation',
            loadComponent: () =>
              import('./pages/invoice/billing-document-list-page.component').then(
                (module) => module.BillingDocumentListPageComponent
              ),
            data: {
              kind: 'quotation',
            }
          },
          {
            path: 'quotation/create',
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'quotation',
              pageMode: 'create'
            }
          },
          {
            path: 'quotation/:id/view',
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'quotation',
              pageMode: 'view'
            }
          },
          {
            path: 'quotation/:id/edit',
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'quotation',
              pageMode: 'edit'
            }
          },
          {
            path: 'suppliers',
            loadComponent: () =>
              import('./pages/invoice/suppliers-page.component').then(
                (module) => module.InvoiceSuppliersPageComponent
              )
          },
          {
            path: 'customers',
            loadComponent: () =>
              import('./pages/invoice/customers-page.component').then(
                (module) => module.InvoiceCustomersPageComponent
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
