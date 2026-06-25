import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import {
  InvoiceLineItemPayload,
  InvoiceRecord,
  InvoicesApiService,
  InvoiceStatus,
  InvoiceType,
  InvoiceUpsertPayload,
} from '../../core/services/invoices-api.service';
import {
  SupplierRecord,
  SuppliersApiService,
  SupplierUpsertPayload,
} from '../../core/services/suppliers-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { SupplierFormDialogComponent } from './supplier-form-dialog.component';

type EditableInvoiceLineItem = InvoiceLineItemPayload & {
  id?: string;
};

type InvoiceDraft = Omit<
  InvoiceUpsertPayload,
  'invoiceType' | 'supplierId' | 'lineItems'
> & {
  supplierId: string;
  lineItems: EditableInvoiceLineItem[];
};

type StatusOption = {
  label: string;
  value: InvoiceStatus;
};

type TagSeverity = 'success' | 'warn' | 'info' | 'danger';

@Component({
  selector: 'app-invoice-workspace',
  imports: [
    AutoCompleteModule,
    ButtonModule,
    DatePipe,
    DecimalPipe,
    FormsModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    SupplierFormDialogComponent,
    TableModule,
    TagModule,
  ],
  templateUrl: './invoice-workspace.component.html',
  styleUrl: './invoice-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceWorkspaceComponent implements OnInit, OnChanges {
  @Input({ required: true }) invoiceType!: InvoiceType;
  @Input({ required: true }) pageTitle!: string;
  @Input({ required: true }) pageSubtitle!: string;

  private readonly invoicesApiService = inject(InvoicesApiService);
  private readonly suppliersApiService = inject(SuppliersApiService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly uiFeedback = inject(UiFeedbackService);

  protected readonly invoices = signal<InvoiceRecord[]>([]);
  protected readonly supplierSuggestions = signal<SupplierRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly savingSupplier = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly supplierDialogVisible = signal(false);

  protected statusOptions: StatusOption[] = [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Issued', value: 'ISSUED' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  protected editingInvoiceId: string | null = null;
  protected draft: InvoiceDraft = this.createDraft();
  protected selectedSupplier: SupplierRecord | null = null;
  protected supplierSearchValue: SupplierRecord | string | null = null;

  private lastCalculatedTotal = 0;

  ngOnInit(): void {
    this.resetDraft();
    this.loadInvoices();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['invoiceType'] && !changes['invoiceType'].firstChange) {
      this.startNewInvoice();
      this.loadInvoices();
    }
  }

  protected startNewInvoice(): void {
    this.errorMessage.set(null);
    this.editingInvoiceId = null;
    this.resetDraft();
    this.changeDetectorRef.markForCheck();
  }

  protected loadInvoices(): void {
    if (!this.invoiceType) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.invoicesApiService.listInvoices(this.invoiceType).subscribe({
      next: (invoices) => {
        this.invoices.set(this.sortInvoices(invoices));
        this.loading.set(false);
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.errorMessage.set(
          'Unable to load invoices. Make sure the backend is running and the database has been migrated.',
        );
        this.loading.set(false);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  protected editInvoice(invoice: InvoiceRecord): void {
    this.editingInvoiceId = invoice.id;
    this.selectedSupplier = invoice.supplier;
    this.supplierSearchValue = invoice.supplier;
    this.draft = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate.slice(0, 10),
      supplierId: invoice.supplierId,
      customerName: invoice.customerName,
      customerAddress: invoice.customerAddress,
      customerGstin: invoice.customerGstin,
      placeOfSupply: invoice.placeOfSupply,
      totalBeforeTax: invoice.totalBeforeTax,
      totalTaxAmount: invoice.totalTaxAmount,
      roundedOff: invoice.roundedOff,
      totalAmount: invoice.totalAmount,
      amountDue: invoice.amountDue,
      status: invoice.status,
      lineItems: invoice.lineItems.length
        ? invoice.lineItems.map((item) => ({
            id: item.id,
            productServiceName: item.productServiceName,
            description: item.description,
            hsnSac: item.hsnSac,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            cgstAmount: item.cgstAmount,
            cgstPercentage: item.cgstPercentage,
            sgstAmount: item.sgstAmount,
            sgstPercentage: item.sgstPercentage,
            lineAmount: item.lineAmount,
          }))
        : [this.createLineItem()],
    };
    this.lastCalculatedTotal = invoice.totalAmount;
    this.errorMessage.set(null);
    this.changeDetectorRef.markForCheck();
  }

  protected searchSuppliers(event: { query: string }): void {
    this.suppliersApiService.listSuppliers(event.query, 'ACTIVE').subscribe({
      next: (suppliers) => {
        this.supplierSuggestions.set(suppliers);
      },
      error: () => {
        this.supplierSuggestions.set([]);
      },
    });
  }

  protected handleSupplierSelection(
    supplier: SupplierRecord | string | null,
  ): void {
    if (!supplier || typeof supplier === 'string') {
      this.selectedSupplier = null;
      this.draft.supplierId = '';
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.selectedSupplier = supplier;
    this.supplierSearchValue = supplier;
    this.draft.supplierId = supplier.id;
    this.changeDetectorRef.markForCheck();
  }

  protected openSupplierDialog(): void {
    this.supplierDialogVisible.set(true);
  }

  protected closeSupplierDialog(): void {
    this.supplierDialogVisible.set(false);
  }

  protected createSupplier(payload: SupplierUpsertPayload): void {
    this.savingSupplier.set(true);

    this.suppliersApiService.createSupplier(payload).subscribe({
      next: (supplier) => {
        this.savingSupplier.set(false);
        this.supplierDialogVisible.set(false);
        this.selectedSupplier = supplier;
        this.supplierSearchValue = supplier;
        this.draft.supplierId = supplier.id;
        this.uiFeedback.success(
          'Supplier created',
          `Supplier "${payload.supplierName}" was created and selected.`,
        );
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.savingSupplier.set(false);
        const message = 'Supplier creation failed. Check the details and try again.';
        this.errorMessage.set(message);
        this.uiFeedback.error('Supplier creation failed', message);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  protected addLineItem(): void {
    this.draft.lineItems = [...this.draft.lineItems, this.createLineItem()];
    this.changeDetectorRef.markForCheck();
  }

  protected removeLineItem(index: number): void {
    if (this.draft.lineItems.length === 1) {
      this.draft.lineItems = [this.createLineItem()];
    } else {
      this.draft.lineItems = this.draft.lineItems.filter(
        (_item, itemIndex) => itemIndex !== index,
      );
    }

    this.recalculateTotals();
  }

  protected recalculateLine(lineItem: EditableInvoiceLineItem): void {
    const taxableValue = this.valueOrZero(lineItem.quantity) * this.valueOrZero(lineItem.unitPrice);
    lineItem.cgstAmount = this.roundCurrency(
      (taxableValue * this.valueOrZero(lineItem.cgstPercentage)) / 100,
    );
    lineItem.sgstAmount = this.roundCurrency(
      (taxableValue * this.valueOrZero(lineItem.sgstPercentage)) / 100,
    );
    lineItem.lineAmount = this.roundCurrency(
      taxableValue + lineItem.cgstAmount + lineItem.sgstAmount,
    );

    this.recalculateTotals();
  }

  protected recalculateTotals(): void {
    const previousCalculatedTotal = this.lastCalculatedTotal;
    const previousAmountDue = this.draft.amountDue;
    const totalBeforeTax = this.roundCurrency(
      this.draft.lineItems.reduce(
        (sum, item) => sum + this.valueOrZero(item.quantity) * this.valueOrZero(item.unitPrice),
        0,
      ),
    );
    const totalTaxAmount = this.roundCurrency(
      this.draft.lineItems.reduce(
        (sum, item) =>
          sum + this.valueOrZero(item.cgstAmount) + this.valueOrZero(item.sgstAmount),
        0,
      ),
    );
    const totalAmount = this.roundCurrency(
      totalBeforeTax + totalTaxAmount + this.valueOrZero(this.draft.roundedOff),
    );

    this.draft.totalBeforeTax = totalBeforeTax;
    this.draft.totalTaxAmount = totalTaxAmount;
    this.draft.totalAmount = totalAmount;

    if (this.approximatelyEqual(previousAmountDue, previousCalculatedTotal)) {
      this.draft.amountDue = totalAmount;
    }

    this.lastCalculatedTotal = totalAmount;
    this.changeDetectorRef.markForCheck();
  }

  protected saveInvoice(): void {
    if (!this.selectedSupplier || !this.draft.supplierId) {
      this.errorMessage.set('Select a supplier before saving the invoice.');
      return;
    }

    const validLineItems = this.draft.lineItems.filter((item) =>
      Boolean(item.productServiceName.trim()),
    );

    if (!validLineItems.length) {
      this.errorMessage.set('Add at least one invoice line item.');
      return;
    }

    const payload = this.buildPayload(validLineItems);
    const isEdit = Boolean(this.editingInvoiceId);
    this.saving.set(true);
    this.errorMessage.set(null);

    const request = this.editingInvoiceId
      ? this.invoicesApiService.updateInvoice(this.editingInvoiceId, payload)
      : this.invoicesApiService.createInvoice(payload);

    request.subscribe({
      next: (invoice) => {
        this.saving.set(false);
        this.invoices.update((current) => this.sortInvoices(this.upsertInvoice(current, invoice)));
        this.editInvoice(invoice);
        this.uiFeedback.success(
          isEdit ? 'Invoice updated' : 'Invoice created',
          `Invoice "${invoice.invoiceNumber}" was saved successfully.`,
        );
      },
      error: () => {
        this.saving.set(false);
        const message =
          'Invoice save failed. Make sure the invoice number is unique and the supplier exists.';
        this.errorMessage.set(message);
        this.uiFeedback.error('Invoice save failed', message);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  protected deleteInvoice(): void {
    if (!this.editingInvoiceId) {
      return;
    }

    this.uiFeedback.confirm({
      header: 'Delete Invoice',
      message: 'Delete this invoice?',
      acceptLabel: 'Delete',
      accept: () => {
        this.deleting.set(true);

        this.invoicesApiService.deleteInvoice(this.editingInvoiceId!).subscribe({
          next: (invoice) => {
            this.deleting.set(false);
            this.invoices.update((current) =>
              current.filter((currentInvoice) => currentInvoice.id !== invoice.id),
            );
            this.startNewInvoice();
            this.uiFeedback.success(
              'Invoice deleted',
              `Invoice "${invoice.invoiceNumber}" was removed successfully.`,
            );
          },
          error: () => {
            this.deleting.set(false);
            const message = 'Invoice delete failed.';
            this.errorMessage.set(message);
            this.uiFeedback.error('Invoice delete failed', message);
            this.changeDetectorRef.markForCheck();
          },
        });
      },
    });
  }

  protected statusSeverity(status: InvoiceStatus): TagSeverity {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'ISSUED':
        return 'info';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'warn';
    }
  }

  protected invoiceTypeLabel(): string {
    return this.invoiceType === 'PROFORMA' ? 'Proforma Invoice' : 'Tax Invoice';
  }

  private resetDraft(): void {
    this.draft = this.createDraft();
    this.selectedSupplier = null;
    this.supplierSearchValue = null;
    this.lastCalculatedTotal = this.draft.totalAmount;
  }

  private createDraft(): InvoiceDraft {
    return {
      invoiceNumber: '',
      invoiceDate: this.todayDate(),
      supplierId: '',
      customerName: '',
      customerAddress: '',
      customerGstin: '',
      placeOfSupply: '',
      totalBeforeTax: 0,
      totalTaxAmount: 0,
      roundedOff: 0,
      totalAmount: 0,
      amountDue: 0,
      status: 'DRAFT',
      lineItems: [this.createLineItem()],
    };
  }

  private createLineItem(): EditableInvoiceLineItem {
    return {
      productServiceName: '',
      description: '',
      hsnSac: '',
      quantity: 1,
      unitPrice: 0,
      cgstAmount: 0,
      cgstPercentage: 9,
      sgstAmount: 0,
      sgstPercentage: 9,
      lineAmount: 0,
    };
  }

  private buildPayload(
    lineItems: EditableInvoiceLineItem[],
  ): InvoiceUpsertPayload {
    return {
      invoiceType: this.invoiceType,
      invoiceNumber: this.draft.invoiceNumber.trim(),
      invoiceDate: new Date(this.draft.invoiceDate).toISOString(),
      supplierId: this.draft.supplierId,
      customerName: this.draft.customerName.trim(),
      customerAddress: this.draft.customerAddress.trim(),
      customerGstin: this.draft.customerGstin.trim().toUpperCase(),
      placeOfSupply: this.draft.placeOfSupply.trim(),
      totalBeforeTax: this.roundCurrency(this.draft.totalBeforeTax),
      totalTaxAmount: this.roundCurrency(this.draft.totalTaxAmount),
      roundedOff: this.roundCurrency(this.draft.roundedOff),
      totalAmount: this.roundCurrency(this.draft.totalAmount),
      amountDue: this.roundCurrency(this.draft.amountDue),
      status: this.draft.status,
      lineItems: lineItems.map((item) => ({
        productServiceName: item.productServiceName.trim(),
        description: item.description.trim(),
        hsnSac: item.hsnSac.trim(),
        quantity: this.valueOrZero(item.quantity),
        unitPrice: this.valueOrZero(item.unitPrice),
        cgstAmount: this.roundCurrency(item.cgstAmount),
        cgstPercentage: this.valueOrZero(item.cgstPercentage),
        sgstAmount: this.roundCurrency(item.sgstAmount),
        sgstPercentage: this.valueOrZero(item.sgstPercentage),
        lineAmount: this.roundCurrency(item.lineAmount),
      })),
    };
  }

  private upsertInvoice(
    invoices: InvoiceRecord[],
    invoice: InvoiceRecord,
  ): InvoiceRecord[] {
    const existingIndex = invoices.findIndex(
      (currentInvoice) => currentInvoice.id === invoice.id,
    );

    if (existingIndex === -1) {
      return [invoice, ...invoices];
    }

    return invoices.map((currentInvoice) =>
      currentInvoice.id === invoice.id ? invoice : currentInvoice,
    );
  }

  private sortInvoices(invoices: InvoiceRecord[]): InvoiceRecord[] {
    return [...invoices].sort(
      (left, right) =>
        new Date(right.invoiceDate).getTime() -
        new Date(left.invoiceDate).getTime(),
    );
  }

  private todayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private valueOrZero(value: number | null | undefined): number {
    return Number.isFinite(value) ? Number(value) : 0;
  }

  private roundCurrency(value: number | null | undefined): number {
    return Math.round(this.valueOrZero(value) * 100) / 100;
  }

  private approximatelyEqual(left: number, right: number): boolean {
    return Math.abs(left - right) < 0.01;
  }
}
