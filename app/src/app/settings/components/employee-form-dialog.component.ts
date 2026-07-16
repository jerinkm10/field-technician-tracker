import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import {
  EmployeeRecord,
  EmployeeRole,
  EmployeeUpsertPayload,
  UserStatus,
} from '../../shared/models/billing.models';

type RoleOption = {
  label: string;
  value: EmployeeRole;
};

type StatusOption = {
  label: string;
  value: UserStatus;
};

type BranchOption = {
  label: string;
  value: string;
};

type EmployeeDraft = {
  name: string;
  username: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  status: UserStatus;
  password: string;
  branchId: string;
};

@Component({
  selector: 'app-employee-form-dialog',
  imports: [
    ButtonModule,
    DialogModule,
    FormsModule,
    InputTextModule,
    SelectModule,
  ],
  templateUrl: './employee-form-dialog.component.html',
  styleUrl: './employee-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeFormDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() saving = false;
  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() employee: EmployeeRecord | null = null;
  @Input() branches: BranchOption[] = [];
  @Input() superAdmin = false;
  @Input() currentBranchName: string | null = null;

  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<EmployeeUpsertPayload>();

  protected get roleOptions(): RoleOption[] {
    return [
      ...(this.superAdmin ? [{ label: 'Branch Admin', value: 'ADMIN' as EmployeeRole }] : []),
      { label: 'Employee', value: 'EMPLOYEE' },
      { label: 'Technician', value: 'TECHNICIAN' },
    ];
  }

  protected readonly statusOptions: StatusOption[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  protected draft: EmployeeDraft = this.emptyDraft();
  protected passwordVisible = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['visible']?.currentValue === true ||
      changes['employee'] ||
      changes['mode']
    ) {
      this.passwordVisible = false;
      this.draft = this.employee
        ? {
            name: this.employee.name,
            username: this.employee.username,
            email: this.employee.email ?? '',
            phone: this.employee.phone,
            role: this.employee.role,
            status: this.employee.status,
            password: '',
            branchId: this.employee.branchId ?? '',
          }
        : this.emptyDraft();
    }
  }

  protected submit(): void {
    if (this.isReadOnly()) {
      return;
    }

    this.save.emit({
      name: this.draft.name.trim(),
      username: this.draft.username.trim(),
      email: this.draft.email.trim() || undefined,
      phone: this.draft.phone.trim(),
      role: this.draft.role,
      status: this.draft.status,
      password: this.draft.password.trim() || undefined,
      branchId: this.superAdmin ? this.draft.branchId || undefined : undefined,
    });
  }

  protected canSubmit(): boolean {
    const passwordValid =
      this.mode === 'create'
        ? this.draft.password.trim().length >= 8
        : !this.draft.password.trim() || this.draft.password.trim().length >= 8;

    return (
      !this.isReadOnly() &&
      Boolean(
        this.draft.name.trim() &&
          this.draft.username.trim() &&
          this.draft.phone.trim() &&
          this.draft.role &&
          this.draft.status &&
          (!this.superAdmin || this.draft.branchId) &&
          passwordValid,
      )
    );
  }

  protected handleHide(): void {
    this.cancel.emit();
  }

  protected dialogTitle(): string {
    switch (this.mode) {
      case 'edit':
        return 'Edit Employee';
      case 'view':
        return 'Employee Details';
      default:
        return 'Create Employee';
    }
  }

  protected primaryActionLabel(): string {
    return this.mode === 'edit' ? 'Update Employee' : 'Create Employee';
  }

  protected isReadOnly(): boolean {
    return this.mode === 'view';
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  protected passwordInputType(): 'text' | 'password' {
    return this.passwordVisible ? 'text' : 'password';
  }

  protected passwordToggleLabel(): string {
    return this.passwordVisible ? 'Hide' : 'Show';
  }

  protected passwordFieldLabel(): string {
    return this.mode === 'edit' ? 'New Password (Optional)' : 'Password';
  }

  protected passwordPlaceholder(): string {
    return this.mode === 'edit'
      ? 'Leave blank to keep the current password'
      : 'Minimum 8 characters';
  }

  protected passwordHelperText(): string {
    return this.mode === 'edit'
      ? 'Leave the password empty if the employee should keep the current password.'
      : 'The password is visible only while you set it here and is stored as a secure hash after save.';
  }

  private emptyDraft(): EmployeeDraft {
    return {
      name: '',
      username: '',
      email: '',
      phone: '',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      password: '',
      branchId: '',
    };
  }
}
