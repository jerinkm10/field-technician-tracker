export type SupplierStatus = 'ACTIVE' | 'INACTIVE';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE';
export type CompanyStatus = 'ACTIVE' | 'INACTIVE';
export type DocumentKind = 'proforma' | 'tax' | 'quotation';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED';
export type BillingDocumentStatus = InvoiceStatus | QuotationStatus;

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type SupplierRecord = {
  id: string;
  supplierName: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
};

export type SupplierUpsertPayload = {
  supplierName: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  status: SupplierStatus;
};

export type CustomerRecord = {
  id: string;
  customerName: string;
  phone: string;
  email: string | null;
  gstin: string | null;
  billingAddress: string;
  shippingAddress: string;
  placeOfSupply: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
};

export type CustomerUpsertPayload = {
  customerName: string;
  phone: string;
  email: string;
  gstin: string;
  billingAddress: string;
  shippingAddress: string;
  placeOfSupply: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  status: CustomerStatus;
};

export type CompanyRecord = {
  id: string;
  companyName: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  logoAttachment: string | null;
  signatureAttachment: string | null;
  sealAttachment: string | null;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
};

export type CompanyUpsertPayload = {
  companyName: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  logoAttachment?: string | null;
  signatureAttachment?: string | null;
  sealAttachment?: string | null;
  status: CompanyStatus;
};

export type BillingLineItemRecord = {
  id: string;
  documentId: string;
  productServiceName: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unitPrice: number;
  cgstAmount: number;
  cgstPercentage: number;
  sgstAmount: number;
  sgstPercentage: number;
  lineAmount: number;
};

export type BillingLineItemPayload = Omit<BillingLineItemRecord, 'id' | 'documentId'>;

export type BillingDocumentRecord = {
  id: string;
  kind: DocumentKind;
  documentTypeLabel: string;
  documentNumber: string;
  documentDate: string;
  validUntil: string | null;
  supplierId: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerGstin: string;
  placeOfSupply: string;
  notes: string | null;
  termsAndConditions: string | null;
  totalBeforeTax: number;
  totalTaxAmount: number;
  roundedOff: number;
  totalAmount: number;
  amountDue: number;
  status: BillingDocumentStatus;
  createdAt: string;
  updatedAt: string;
  supplier: SupplierRecord;
  customer: CustomerRecord;
  lineItems: BillingLineItemRecord[];
};

export type BillingDocumentUpsertPayload = {
  documentNumber: string;
  documentDate: string;
  validUntil?: string | null;
  supplierId: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerGstin: string;
  placeOfSupply: string;
  notes?: string;
  termsAndConditions?: string;
  totalBeforeTax: number;
  totalTaxAmount: number;
  roundedOff: number;
  totalAmount: number;
  amountDue: number;
  status: BillingDocumentStatus;
  lineItems: BillingLineItemPayload[];
};

export type BillingPreviewModel = {
  company: CompanyRecord | null;
  documentTypeLabel: string;
  documentNumber: string;
  documentDate: string;
  validUntil: string | null;
  supplier: SupplierRecord | null;
  customer: CustomerRecord | null;
  customerName: string;
  customerAddress: string;
  customerGstin: string;
  placeOfSupply: string;
  lineItems: BillingLineItemPayload[];
  totalBeforeTax: number;
  totalTaxAmount: number;
  roundedOff: number;
  totalAmount: number;
  amountDue: number;
  notes: string;
  termsAndConditions: string;
  status: BillingDocumentStatus;
};

export type SupplierListFilters = {
  search?: string;
  status?: SupplierStatus;
  gstin?: string;
  phone?: string;
  page?: number;
  limit?: number;
};

export type CustomerListFilters = {
  search?: string;
  status?: CustomerStatus;
  gstin?: string;
  phone?: string;
  page?: number;
  limit?: number;
};

export type BillingDocumentListFilters = {
  search?: string;
  status?: BillingDocumentStatus;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type InvoiceInputFieldRecord = {
  id: string;
  section: string;
  fieldKey: string;
  label: string;
  inputType: string;
  placeholder: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceInputFieldUpsertPayload = {
  section: string;
  fieldKey: string;
  label: string;
  inputType: string;
  placeholder?: string;
  isActive: boolean;
};

export type InvoiceInputFieldListFilters = {
  search?: string;
  section?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
};
