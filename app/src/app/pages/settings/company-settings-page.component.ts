import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { CompanySettingsApiService } from '../../core/services/company-settings-api.service';
import {
  CompanyRecord,
  CompanyStatus,
  CompanyUpsertPayload,
} from '../../shared/models/billing.models';

type StatusOption = {
  label: string;
  value: CompanyStatus;
};

@Component({
  selector: 'app-company-settings-page',
  imports: [
    ButtonModule,
    FormsModule,
    InputTextModule,
    SelectModule,
    TagModule,
  ],
  templateUrl: './company-settings-page.component.html',
  styleUrl: './company-settings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanySettingsPageComponent {
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly uploadingLogo = signal(false);
  protected readonly uploadingSignature = signal(false);
  protected readonly uploadingSeal = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly statusOptions: StatusOption[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  protected companyId: string | null = null;
  protected draft: CompanyUpsertPayload = this.emptyDraft();

  constructor(
    private readonly companySettingsApiService: CompanySettingsApiService,
  ) {
    this.loadCompanySettings();
  }

  protected loadCompanySettings(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.companySettingsApiService.getCompanySettings().subscribe({
      next: (company) => {
        this.loading.set(false);
        this.applyCompany(company);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set(
          'Unable to load company settings. Make sure the backend is running and an admin token is available.',
        );
      },
    });
  }

  protected saveCompanySettings(): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload: CompanyUpsertPayload = {
      companyName: this.draft.companyName.trim(),
      phone: this.draft.phone.trim(),
      email: this.draft.email.trim(),
      gstin: this.draft.gstin.trim().toUpperCase(),
      address: this.draft.address.trim(),
      city: this.draft.city.trim(),
      state: this.draft.state.trim(),
      pinCode: this.draft.pinCode.trim(),
      country: this.draft.country.trim(),
      bankName: this.draft.bankName.trim(),
      accountNumber: this.draft.accountNumber.trim(),
      ifscCode: this.draft.ifscCode.trim().toUpperCase(),
      logoAttachment: this.draft.logoAttachment ?? null,
      signatureAttachment: this.draft.signatureAttachment ?? null,
      sealAttachment: this.draft.sealAttachment ?? null,
      invoiceTermsAndConditions:
        this.draft.invoiceTermsAndConditions?.trim() || null,
      proformaTermsAndConditions:
        this.draft.proformaTermsAndConditions?.trim() || null,
      quotationTermsAndConditions:
        this.draft.quotationTermsAndConditions?.trim() || null,
      amcTermsAndConditions: this.draft.amcTermsAndConditions?.trim() || null,
      status: this.draft.status,
    };

    const request = this.companyId
      ? this.companySettingsApiService.updateCompanySettings(this.companyId, payload)
      : this.companySettingsApiService.createCompanySettings(payload);

    request.subscribe({
      next: (company) => {
        this.saving.set(false);
        this.applyCompany(company);
        this.successMessage.set('Company settings saved successfully.');
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set(
          'Company settings save failed. Check the required fields and try again.',
        );
      },
    });
  }

  protected uploadLogo(event: Event): void {
    const file = this.fileFromEvent(event);

    if (!file) {
      return;
    }

    this.uploadingLogo.set(true);
    this.errorMessage.set(null);

    this.companySettingsApiService.uploadLogo(file).subscribe({
      next: (response) => {
        this.uploadingLogo.set(false);
        this.draft.logoAttachment = response.fileUrl;
      },
      error: () => {
        this.uploadingLogo.set(false);
        this.errorMessage.set('Logo upload failed. Upload a valid image file and try again.');
      },
    });
  }

  protected uploadSignature(event: Event): void {
    const file = this.fileFromEvent(event);

    if (!file) {
      return;
    }

    this.uploadingSignature.set(true);
    this.errorMessage.set(null);

    this.companySettingsApiService.uploadSignature(file).subscribe({
      next: (response) => {
        this.uploadingSignature.set(false);
        this.draft.signatureAttachment = response.fileUrl;
      },
      error: () => {
        this.uploadingSignature.set(false);
        this.errorMessage.set(
          'Signature upload failed. Upload a valid image file and try again.',
        );
      },
    });
  }

  protected uploadSeal(event: Event): void {
    const file = this.fileFromEvent(event);

    if (!file) {
      return;
    }

    this.uploadingSeal.set(true);
    this.errorMessage.set(null);

    this.companySettingsApiService.uploadSeal(file).subscribe({
      next: (response) => {
        this.uploadingSeal.set(false);
        this.draft.sealAttachment = response.fileUrl;
      },
      error: () => {
        this.uploadingSeal.set(false);
        this.errorMessage.set('Seal upload failed. Upload a valid image file and try again.');
      },
    });
  }

  protected canSave(): boolean {
    return Boolean(
      this.draft.companyName.trim() &&
        this.draft.phone.trim() &&
        this.draft.email.trim() &&
        this.draft.gstin.trim() &&
        this.draft.address.trim() &&
        this.draft.city.trim() &&
        this.draft.state.trim() &&
        this.draft.pinCode.trim() &&
        this.draft.country.trim() &&
        this.draft.bankName.trim() &&
        this.draft.accountNumber.trim() &&
        this.draft.ifscCode.trim(),
    );
  }

  private applyCompany(company: CompanyRecord | null): void {
    if (!company) {
      this.companyId = null;
      this.draft = this.emptyDraft();
      return;
    }

    this.companyId = company.id;
    this.draft = {
      companyName: company.companyName,
      phone: company.phone,
      email: company.email,
      gstin: company.gstin,
      address: company.address,
      city: company.city,
      state: company.state,
      pinCode: company.pinCode,
      country: company.country,
      bankName: company.bankName,
      accountNumber: company.accountNumber,
      ifscCode: company.ifscCode,
      logoAttachment: company.logoAttachment,
      signatureAttachment: company.signatureAttachment,
      sealAttachment: company.sealAttachment,
      invoiceTermsAndConditions: company.invoiceTermsAndConditions ?? '',
      proformaTermsAndConditions: company.proformaTermsAndConditions ?? '',
      quotationTermsAndConditions: company.quotationTermsAndConditions ?? '',
      amcTermsAndConditions: company.amcTermsAndConditions ?? '',
      status: company.status,
    };
  }

  private emptyDraft(): CompanyUpsertPayload {
    return {
      companyName: '',
      phone: '',
      email: '',
      gstin: '',
      address: '',
      city: '',
      state: '',
      pinCode: '',
      country: 'India',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      logoAttachment: null,
      signatureAttachment: null,
      sealAttachment: null,
      invoiceTermsAndConditions: '',
      proformaTermsAndConditions: '',
      quotationTermsAndConditions: '',
      amcTermsAndConditions: '',
      status: 'ACTIVE',
    };
  }

  private fileFromEvent(event: Event): File | null {
    const input = event.target as HTMLInputElement;
    return input.files?.item(0) ?? null;
  }
}
