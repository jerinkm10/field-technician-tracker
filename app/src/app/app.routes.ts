import { Routes } from '@angular/router';

import {
  adminAuthGuard,
  adminChildAuthGuard,
  ledgerAccessGuard,
  loginPageGuard,
  roleAccessGuard,
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
        canActivate: [roleAccessGuard],
        data: {
          roles: ['ADMIN_OWNER', 'ADMIN', 'EMPLOYEE'],
        },
        loadComponent: () =>
          import('./pages/dashboard/dashboard-page.component').then(
            (module) => module.DashboardPageComponent
          )
      },
      {
        path: 'live-map',
        canActivate: [roleAccessGuard],
        data: {
          roles: ['ADMIN_OWNER', 'ADMIN'],
        },
        loadComponent: () =>
          import('./pages/live-map/live-map-page.component').then(
            (module) => module.LiveMapPageComponent
          )
      },
      {
        path: 'jobs',
        canActivate: [roleAccessGuard],
        data: {
          roles: ['ADMIN_OWNER', 'ADMIN'],
        },
        loadComponent: () =>
          import('./pages/jobs/jobs-page.component').then((module) => module.JobsPageComponent)
      },
      {
        path: 'technicians',
        canActivate: [roleAccessGuard],
        data: {
          roles: ['ADMIN_OWNER', 'ADMIN'],
        },
        loadComponent: () =>
          import('./pages/technicians/technicians-page.component').then(
            (module) => module.TechniciansPageComponent
          )
      },
      {
        path: 'reports',
        canActivate: [roleAccessGuard],
        data: {
          roles: ['ADMIN_OWNER', 'ADMIN'],
        },
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
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/billing-document-list-page.component').then(
                (module) => module.BillingDocumentListPageComponent
              ),
            data: {
              kind: 'proforma',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'proforma/create',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'proforma',
              pageMode: 'create',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'proforma/:id/view',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'proforma',
              pageMode: 'view',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'proforma/:id/edit',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'proforma',
              pageMode: 'edit',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'tax',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/billing-document-list-page.component').then(
                (module) => module.BillingDocumentListPageComponent
              ),
            data: {
              kind: 'tax',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'tax/create',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'tax',
              pageMode: 'create',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'tax/:id/view',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'tax',
              pageMode: 'view',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'tax/:id/edit',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'tax',
              pageMode: 'edit',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'quotation',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/billing-document-list-page.component').then(
                (module) => module.BillingDocumentListPageComponent
              ),
            data: {
              kind: 'quotation',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'quotation/create',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'quotation',
              pageMode: 'create',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'quotation/:id/view',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'quotation',
              pageMode: 'view',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'quotation/:id/edit',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/billing-document-editor-page.component').then(
                (module) => module.BillingDocumentEditorPageComponent
              ),
            data: {
              kind: 'quotation',
              pageMode: 'edit',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'suppliers',
            redirectTo: '/settings/branch',
            pathMatch: 'full'
          },
          {
            path: 'customers',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/customers-page.component').then(
                (module) => module.InvoiceCustomersPageComponent
              ),
            data: {
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'input-fields',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/invoice-input-fields-page.component').then(
                (module) => module.InvoiceInputFieldsPageComponent
              ),
            data: {
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
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
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/business/outstandings-page.component').then(
                (module) => module.OutstandingsPageComponent
              ),
            data: {
              roles: ['ADMIN_OWNER', 'ADMIN', 'EMPLOYEE'],
            }
          },
          {
            path: 'amc',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/business/amc-page.component').then(
                (module) => module.AmcPageComponent
              ),
            data: {
              roles: ['ADMIN_OWNER', 'ADMIN', 'EMPLOYEE'],
            }
          },
          {
            path: 'ledger',
            canActivate: [ledgerAccessGuard],
            loadComponent: () =>
              import('./pages/business/ledger-page.component').then(
                (module) => module.LedgerPageComponent
              ),
          },
          {
            path: 'lead',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/business/leads-page.component').then(
                (module) => module.LeadsPageComponent
              ),
            data: {
              roles: ['ADMIN_OWNER', 'ADMIN', 'EMPLOYEE'],
            }
          },
          {
            path: 'product-service',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/business/product-services-page.component').then(
                (module) => module.ProductServicesPageComponent
              ),
            data: {
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'complaints',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/business/complaints-page.component').then(
                (module) => module.ComplaintsPageComponent
              ),
            data: {
              roles: ['ADMIN_OWNER', 'ADMIN', 'EMPLOYEE'],
            }
          },
          {
            path: 'tasks',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/business/tasks-page.component').then(
                (module) => module.TasksPageComponent
              ),
            data: {
              roles: ['ADMIN_OWNER', 'ADMIN', 'EMPLOYEE'],
            }
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
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/settings/company-settings-page.component').then(
                (module) => module.CompanySettingsPageComponent
              ),
            data: {
              roles: ['ADMIN_OWNER', 'ADMIN'],
              superAdminOnly: true,
            }
          },
          {
            path: 'branch',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/suppliers-page.component').then(
                (module) => module.InvoiceSuppliersPageComponent
              ),
            data: {
              pageMode: 'list',
              roles: ['ADMIN_OWNER', 'ADMIN'],
              superAdminOnly: true,
            }
          },
          {
            path: 'branch/create',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/suppliers-page.component').then(
                (module) => module.InvoiceSuppliersPageComponent
              ),
            data: {
              pageMode: 'create',
              roles: ['ADMIN_OWNER', 'ADMIN'],
              superAdminOnly: true,
            }
          },
          {
            path: 'branch/:id/view',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/suppliers-page.component').then(
                (module) => module.InvoiceSuppliersPageComponent
              ),
            data: {
              pageMode: 'view',
              roles: ['ADMIN_OWNER', 'ADMIN'],
              superAdminOnly: true,
            }
          },
          {
            path: 'branch/:id/edit',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/invoice/suppliers-page.component').then(
                (module) => module.InvoiceSuppliersPageComponent
              ),
            data: {
              pageMode: 'edit',
              roles: ['ADMIN_OWNER', 'ADMIN'],
              superAdminOnly: true,
            }
          },
          {
            path: 'employees',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/settings/employees-page.component').then(
                (module) => module.EmployeesPageComponent
              ),
            data: {
              pageMode: 'list',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'employees/create',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/settings/employees-page.component').then(
                (module) => module.EmployeesPageComponent
              ),
            data: {
              pageMode: 'create',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'employees/:id/view',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/settings/employees-page.component').then(
                (module) => module.EmployeesPageComponent
              ),
            data: {
              pageMode: 'view',
              roles: ['ADMIN_OWNER', 'ADMIN'],
            }
          },
          {
            path: 'employees/:id/edit',
            canActivate: [roleAccessGuard],
            loadComponent: () =>
              import('./pages/settings/employees-page.component').then(
                (module) => module.EmployeesPageComponent
              ),
            data: {
              pageMode: 'edit',
              roles: ['ADMIN_OWNER', 'ADMIN'],
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
