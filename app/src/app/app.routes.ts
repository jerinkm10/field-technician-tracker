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
            redirectTo: '/settings/branch',
            pathMatch: 'full'
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
      },
      {
        path: 'business',
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'outstanding'
          },
          {
            path: 'outstanding',
            loadComponent: () =>
              import('./pages/business/outstandings-page.component').then(
                (module) => module.OutstandingsPageComponent
              ),
          },
          {
            path: 'amc',
            loadComponent: () =>
              import('./pages/business/amc-page.component').then(
                (module) => module.AmcPageComponent
              ),
          },
          {
            path: 'ledger',
            loadComponent: () =>
              import('./pages/business/ledger-page.component').then(
                (module) => module.LedgerPageComponent
              ),
          },
          {
            path: 'lead',
            loadComponent: () =>
              import('./pages/business/leads-page.component').then(
                (module) => module.LeadsPageComponent
              ),
          },
          {
            path: 'product-service',
            loadComponent: () =>
              import('./pages/business/product-services-page.component').then(
                (module) => module.ProductServicesPageComponent
              ),
          },
        ]
      },
      {
        path: 'settings',
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'company'
          },
          {
            path: 'suppliers',
            redirectTo: 'branch',
            pathMatch: 'full'
          },
          {
            path: 'suppliers/create',
            redirectTo: 'branch/create',
            pathMatch: 'full'
          },
          {
            path: 'suppliers/:id/view',
            redirectTo: 'branch/:id/view',
            pathMatch: 'full'
          },
          {
            path: 'suppliers/:id/edit',
            redirectTo: 'branch/:id/edit',
            pathMatch: 'full'
          },
          {
            path: 'company',
            loadComponent: () =>
              import('./pages/settings/company-settings-page.component').then(
                (module) => module.CompanySettingsPageComponent
              )
          },
          {
            path: 'branch',
            loadComponent: () =>
              import('./pages/invoice/suppliers-page.component').then(
                (module) => module.InvoiceSuppliersPageComponent
              ),
            data: {
              pageMode: 'list'
            }
          },
          {
            path: 'branch/create',
            loadComponent: () =>
              import('./pages/invoice/suppliers-page.component').then(
                (module) => module.InvoiceSuppliersPageComponent
              ),
            data: {
              pageMode: 'create'
            }
          },
          {
            path: 'branch/:id/view',
            loadComponent: () =>
              import('./pages/invoice/suppliers-page.component').then(
                (module) => module.InvoiceSuppliersPageComponent
              ),
            data: {
              pageMode: 'view'
            }
          },
          {
            path: 'branch/:id/edit',
            loadComponent: () =>
              import('./pages/invoice/suppliers-page.component').then(
                (module) => module.InvoiceSuppliersPageComponent
              ),
            data: {
              pageMode: 'edit'
            }
          },
          {
            path: 'employees',
            loadComponent: () =>
              import('./pages/settings/employees-page.component').then(
                (module) => module.EmployeesPageComponent
              ),
            data: {
              pageMode: 'list'
            }
          },
          {
            path: 'employees/create',
            loadComponent: () =>
              import('./pages/settings/employees-page.component').then(
                (module) => module.EmployeesPageComponent
              ),
            data: {
              pageMode: 'create'
            }
          },
          {
            path: 'employees/:id/view',
            loadComponent: () =>
              import('./pages/settings/employees-page.component').then(
                (module) => module.EmployeesPageComponent
              ),
            data: {
              pageMode: 'view'
            }
          },
          {
            path: 'employees/:id/edit',
            loadComponent: () =>
              import('./pages/settings/employees-page.component').then(
                (module) => module.EmployeesPageComponent
              ),
            data: {
              pageMode: 'edit'
            }
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
