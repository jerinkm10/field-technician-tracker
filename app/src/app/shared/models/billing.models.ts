export type AppUserRole = 'ADMIN_OWNER' | 'ADMIN' | 'EMPLOYEE' | 'TECHNICIAN';
export type EmployeeRole = Exclude<AppUserRole, 'ADMIN_OWNER'>;
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type SupplierStatus = 'ACTIVE' | 'INACTIVE';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE';
export type CompanyStatus = 'ACTIVE' | 'INACTIVE';
export type ProductServiceType = 'PRODUCT' | 'SERVICE';
export type ProductServiceStatus = 'ACTIVE' | 'INACTIVE';
export type ProductServiceHistoryAction =
  | 'CREATE'
  | 'EDIT'
  | 'RATE_CHANGE'
  | 'TAX_CHANGE'
  | 'STATUS_CHANGE'
  | 'DEACTIVATE'
  | 'DELETE';
export type OutstandingInvoiceType = 'PROFORMA' | 'TAX';
export type OutstandingStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
export type AmcBillingPeriod = 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
export type AmcStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'FOLLOW_UP'
  | 'DEMO_SCHEDULED'
  | 'CONVERTED'
  | 'LOST';
export type ComplaintContactPerson =
  | 'BANK_MANAGER'
  | 'ASSISTANT_MANAGER'
  | 'STAFF'
  | 'OWNER'
  | 'OTHER';
export type ComplaintStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'CONVERTED_TO_JOB'
  | 'CLOSED'
  | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
export type TaskReferenceType =
  | 'OUTSTANDING'
  | 'LEAD'
  | 'JOB'
  | 'AMC_RENEWAL'
  | 'COMPLAINT';
export type NotificationReferenceType =
  | 'LEAD'
  | 'JOB'
  | 'AMC'
  | 'OUTSTANDING'
  | 'TASK'
  | 'COMPLAINT';
export type JobStatus = 'PENDING' | 'ASSIGNED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
export type JobPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type JobAssignmentRoleType = 'TECHNICIAN' | 'EMPLOYEE';
export type JobAssignmentStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED';
export type LedgerDocumentType =
  | 'PROFORMA_INVOICE'
  | 'TAX_INVOICE'
  | 'AMC_INVOICE'
  | 'QUOTATION'
  | 'OUTSTANDING';
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

export type EmployeeRecord = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string;
  role: EmployeeRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  technicianProfileId: string | null;
  technicianStatus: 'AVAILABLE' | 'ON_JOB' | 'OFFLINE' | null;
};

export type EmployeeUpsertPayload = {
  name: string;
  username: string;
  email?: string;
  phone: string;
  role: EmployeeRole;
  status: UserStatus;
  password?: string;
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
  invoiceTermsAndConditions: string | null;
  proformaTermsAndConditions: string | null;
  quotationTermsAndConditions: string | null;
  amcTermsAndConditions: string | null;
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
  invoiceTermsAndConditions?: string | null;
  proformaTermsAndConditions?: string | null;
  quotationTermsAndConditions?: string | null;
  amcTermsAndConditions?: string | null;
  status: CompanyStatus;
};

export type DocumentNumberSuggestion = {
  documentNumber: string;
};

export type ProductServiceRecord = {
  id: string;
  name: string;
  type: ProductServiceType;
  description: string;
  hsnSacCode: string;
  unit: string;
  defaultRate: number;
  taxPercentage: number;
  status: ProductServiceStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProductServiceUpsertPayload = {
  name: string;
  type: ProductServiceType;
  description: string;
  hsnSacCode: string;
  unit: string;
  defaultRate: number;
  taxPercentage: number;
  status: ProductServiceStatus;
};

export type ProductServiceHistoryRecord = {
  id: string;
  productServiceId: string | null;
  productServiceName: string;
  action: ProductServiceHistoryAction;
  oldValue: Record<string, string | number> | null;
  newValue: Record<string, string | number> | null;
  note: string | null;
  changedById: string | null;
  changedByName: string;
  createdAt: string;
};

export type OutstandingRecord = {
  id: string;
  invoiceId: string;
  invoiceType: OutstandingInvoiceType;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  creditAmount: number;
  outstandingAmount: number;
  status: OutstandingStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OutstandingUpdatePayload = {
  paidAmount: number;
  creditAmount: number;
  dueDate: string;
  status: OutstandingStatus;
  note?: string;
};

export type AmcInvoiceSummary = {
  id: string;
  invoiceId: string;
  periodStartDate: string;
  periodEndDate: string;
  amount: number;
  createdAt: string;
  invoice: {
    id: string;
    invoiceType: OutstandingInvoiceType;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    amountDue: number;
    status: InvoiceStatus;
  };
};

export type AmcRecord = {
  id: string;
  amcNumber: string;
  customerId: string;
  customerName: string;
  branchId: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  billingPeriod: AmcBillingPeriod;
  billingPeriodMonths: number;
  contractAmount: number;
  taxPercentage: number;
  status: AmcStatus;
  lastPaidDate: string | null;
  nextBillingDate: string | null;
  currentBillingPeriodStartDate: string | null;
  currentBillingPeriodEndDate: string | null;
  canCreateInvoice: boolean;
  termsAndConditions: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  customer: CustomerRecord;
  branch: SupplierRecord;
  invoices: AmcInvoiceSummary[];
};

export type AmcUpsertPayload = {
  amcNumber: string;
  customerId: string;
  customerName?: string;
  branchId: string;
  startDate: string;
  endDate: string;
  billingPeriod: AmcBillingPeriod;
  contractAmount: number;
  taxPercentage: number;
  status: AmcStatus;
  lastPaidDate?: string;
  nextBillingDate?: string;
  termsAndConditions?: string;
  note?: string;
};

export type AmcCreateInvoiceResponse = {
  amc: AmcRecord;
  invoice: {
    id: string;
    invoiceType: OutstandingInvoiceType;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    amountDue: number;
    status: InvoiceStatus;
  };
};

export type AmcDashboardSummary = {
  activeCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  paymentDueCount: number;
  overduePaymentCount: number;
};

export type LedgerLineItemRecord = {
  productServiceName: string;
  description: string | null;
  hsnSac: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
};

export type LedgerRecord = {
  id: string;
  sourceId: string;
  sourceCategory: 'INVOICE' | 'QUOTATION' | 'OUTSTANDING';
  date: string;
  type: LedgerDocumentType;
  documentNumber: string;
  customerId: string;
  customerName: string;
  productService: string;
  hsnSacCode: string;
  debit: number;
  credit: number;
  balance: number;
  status: string;
  note: string | null;
  branchName: string | null;
  referenceNumber: string | null;
  totalAmount: number;
  amountDue: number | null;
  outstandingAmount: number | null;
  dueDate: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: LedgerLineItemRecord[];
};

export type LedgerSummary = {
  totalAmount: number;
  totalTax: number;
  totalServiceCost: number;
  totalProductCost: number;
};

export type LedgerPageResponse = PaginatedResponse<LedgerRecord> & {
  summary: LedgerSummary;
};

export type LedgerSearchSuggestionCategory =
  | 'CUSTOMER'
  | 'PRODUCT_SERVICE'
  | 'HSN_SAC'
  | 'INVOICE'
  | 'QUOTATION';

export type LedgerSearchSuggestion = {
  category: LedgerSearchSuggestionCategory;
  label: string;
  value: string;
  query: string;
  displayLabel: string;
};

export type LeadNoteRecord = {
  id: string;
  leadId: string;
  note: string;
  createdById: string | null;
  createdByName: string;
  createdAt: string;
};

export type LeadStatusHistoryRecord = {
  id: string;
  leadId: string;
  status: LeadStatus;
  note: string | null;
  nextFollowUpDate: string | null;
  changedById: string | null;
  changedByName: string;
  createdAt: string;
};

export type LeadSuggestionRecord = {
  id: string;
  leadName: string;
  customerName: string;
  phone: string;
  email: string | null;
  location: string;
  branchId: string;
  branchName: string;
  source: string;
  interestedProductServiceId: string;
  assignedToEmployeeId: string | null;
  interestedProductService: Pick<ProductServiceRecord, 'id' | 'name'>;
};

export type LeadPerformanceRecord = {
  employeeId: string;
  employeeName: string;
  username: string;
  role: Extract<AppUserRole, 'ADMIN' | 'EMPLOYEE'>;
  status: UserStatus;
  totalLeadsAssigned: number;
  convertedLeads: number;
  lostLeads: number;
  followUpsDue: number;
  conversionPercentage: number;
};

export type LeadPerformanceResponse = {
  summary: {
    totalLeadsAssigned: number;
    convertedLeads: number;
    lostLeads: number;
    followUpsDue: number;
    conversionPercentage: number;
  };
  employees: LeadPerformanceRecord[];
};

export type LeadRecord = {
  id: string;
  leadName: string;
  customerName: string;
  phone: string;
  email: string | null;
  location: string;
  branchId: string;
  branchName: string;
  source: string;
  interestedProductServiceId: string;
  assignedToEmployeeId: string | null;
  assignedAt: string | null;
  status: LeadStatus;
  note: string | null;
  nextFollowUpDate: string | null;
  createdAt: string;
  updatedAt: string;
  branch: Pick<SupplierRecord, 'id' | 'supplierName' | 'phone' | 'gstin' | 'status'>;
  interestedProductService: Pick<
    ProductServiceRecord,
    'id' | 'name' | 'type' | 'hsnSacCode' | 'status'
  >;
  assignedToEmployee: Pick<
    EmployeeRecord,
    'id' | 'name' | 'username' | 'email' | 'phone' | 'role' | 'status'
  > | null;
  notes?: LeadNoteRecord[];
  statusHistory?: LeadStatusHistoryRecord[];
};

export type LeadUpsertPayload = {
  leadName: string;
  customerName: string;
  phone: string;
  email?: string;
  location: string;
  branchId: string;
  source: string;
  interestedProductServiceId: string;
  assignedToEmployeeId?: string | null;
  status: LeadStatus;
  note?: string;
  nextFollowUpDate?: string;
};

export type JobRecord = {
  id: string;
  jobNumber: string;
  title: string;
  description: string;
  priority: JobPriority;
  branchId: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string;
  };
  branch:
    | Pick<
        SupplierRecord,
        | 'id'
        | 'supplierName'
        | 'phone'
        | 'email'
        | 'gstin'
        | 'address'
        | 'bankName'
        | 'accountNumber'
        | 'ifscCode'
        | 'status'
        | 'createdAt'
        | 'updatedAt'
      >
    | null;
  technician:
    | {
        id: string;
        phone: string;
        status: 'AVAILABLE' | 'ON_JOB' | 'OFFLINE';
        user: Pick<EmployeeRecord, 'id' | 'name' | 'email' | 'role'>;
      }
    | null;
  productService:
    | Pick<ProductServiceRecord, 'id' | 'name' | 'type' | 'hsnSacCode'>
    | null;
  assignments: JobAssignmentRecord[];
  status: JobStatus;
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type JobAssignmentRecord = {
  id: string;
  userId: string;
  roleType: JobAssignmentRoleType;
  status: JobAssignmentStatus;
  assignedAt: string;
  user: Pick<
    EmployeeRecord,
    'id' | 'name' | 'username' | 'email' | 'phone' | 'role' | 'status'
  > & {
    technicianProfileId: string | null;
    technicianStatus: 'AVAILABLE' | 'ON_JOB' | 'OFFLINE' | null;
  };
};

export type JobUpsertPayload = {
  jobNumber: string;
  title: string;
  description: string;
  customerId: string;
  branchId?: string | null;
  technicianId?: string | null;
  assignedMemberIds?: string[];
  productServiceId?: string | null;
  scheduledDate: string;
  priority?: JobPriority;
  status?: JobStatus;
};

export type ComplaintRecord = {
  id: string;
  customerId: string | null;
  customerName: string;
  contactPerson: ComplaintContactPerson;
  phone: string;
  email: string | null;
  address: string;
  location: string;
  complaintTitle: string;
  complaintDescription: string;
  status: ComplaintStatus;
  assignedEmployeeId: string | null;
  notes: string | null;
  jobId: string | null;
  createdAt: string;
  updatedAt: string;
  customer:
    | {
        id: string;
        name: string;
        phone: string;
        email: string | null;
        address: string;
      }
    | null;
  assignedEmployee: Pick<
    EmployeeRecord,
    'id' | 'name' | 'username' | 'email' | 'role' | 'status'
  > | null;
  job:
    | {
        id: string;
        jobNumber: string;
        title: string;
        status: JobStatus;
        scheduledDate: string;
      }
    | null;
};

export type ComplaintUpsertPayload = {
  customerId?: string | null;
  customerName: string;
  contactPerson: ComplaintContactPerson;
  phone: string;
  email?: string;
  address: string;
  location: string;
  complaintTitle: string;
  complaintDescription: string;
  status?: ComplaintStatus;
  assignedEmployeeId?: string | null;
  notes?: string;
};

export type EmployeeTaskRecord = {
  id: string;
  title: string;
  priority: TaskPriority;
  dueDate: string;
  customerId: string | null;
  assignedEmployeeId: string;
  referenceType: TaskReferenceType;
  referenceId: string;
  status: TaskStatus;
  sourceSnapshot: Record<string, string | number | null> | null;
  createdAt: string;
  updatedAt: string;
  customer:
    | {
        id: string;
        name: string;
        phone: string;
        address: string;
      }
    | null;
  assignedEmployee: {
    id: string;
    name: string;
    username: string;
    role: AppUserRole;
    status: UserStatus;
  };
};

export type EmployeeTaskSummaryResponse = {
  todayTasks: number;
  overdueTasks: number;
  completedTasks: number;
  pendingTasks: number;
  recentTasks: EmployeeTaskRecord[];
};

export type EmployeeTaskStatusUpdatePayload = {
  status?: TaskStatus;
};

export type NotificationRecord = {
  id: string;
  userId: string;
  title: string;
  message: string;
  referenceType: NotificationReferenceType;
  referenceId: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationListResponse = PaginatedResponse<NotificationRecord> & {
  unreadCount: number;
};

export type LeadStatusUpdatePayload = {
  status: LeadStatus;
  note?: string;
  nextFollowUpDate?: string;
};

export type LeadImportPreviewRow = {
  rowNumber: number;
  leadName: string;
  customerName: string;
  phone: string;
  email: string | null;
  location: string;
  branch: string;
  source: string;
  interestedProductService: string;
  status: LeadStatus;
  note: string | null;
  nextFollowUpDate: string | null;
  branchId: string | null;
  branchName: string | null;
  interestedProductServiceId: string | null;
  interestedProductServiceName: string | null;
  isValid: boolean;
  errors: string[];
};

export type LeadImportPreviewResponse = {
  mode: 'preview' | 'imported';
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    importedRows: number;
  };
  rows: LeadImportPreviewRow[];
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

export type EmployeeListFilters = {
  search?: string;
  role?: EmployeeRole;
  status?: UserStatus;
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

export type ProductServiceListFilters = {
  search?: string;
  type?: ProductServiceType;
  status?: ProductServiceStatus;
  hsnSacCode?: string;
  page?: number;
  limit?: number;
};

export type OutstandingListFilters = {
  search?: string;
  fromDate?: string;
  toDate?: string;
  status?: OutstandingStatus;
  customerId?: string;
  invoiceType?: OutstandingInvoiceType;
  page?: number;
  limit?: number;
};

export type AmcListFilters = {
  search?: string;
  fromDate?: string;
  toDate?: string;
  status?: AmcStatus;
  customerId?: string;
  billingPeriod?: AmcBillingPeriod;
  page?: number;
  limit?: number;
};

export type LedgerListFilters = {
  search?: string;
  fromDate?: string;
  toDate?: string;
  customerId?: string;
  documentType?: LedgerDocumentType;
  status?: string;
  productServiceId?: string;
  hsnSacCode?: string;
  page?: number;
  limit?: number;
};

export type LeadListFilters = {
  search?: string;
  status?: LeadStatus;
  branchId?: string;
  assignedToEmployeeId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
};

export type JobListFilters = {
  search?: string;
  fromDate?: string;
  toDate?: string;
  status?: JobStatus;
  priority?: JobPriority;
  customerId?: string;
  assignedUserId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
};

export type ComplaintListFilters = {
  search?: string;
  status?: ComplaintStatus;
  customerId?: string;
  assignedEmployeeId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
};

export type EmployeeTaskListFilters = {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  referenceType?: TaskReferenceType;
  assignedEmployeeId?: string;
  fromDate?: string;
  toDate?: string;
  todayOnly?: boolean;
  page?: number;
  limit?: number;
};

export type DashboardOutstandingAlert = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  dueDate: string;
  outstandingAmount: number;
  status: OutstandingStatus;
  daysOverdue: number;
};

export type DashboardAmcExpiringAlert = {
  id: string;
  amcNumber: string;
  customerName: string;
  branchName: string;
  endDate: string;
  daysUntilExpiry: number;
  status: AmcStatus;
};

export type DashboardAmcPaymentDueAlert = {
  id: string;
  amcNumber: string;
  customerName: string;
  branchName: string;
  nextBillingDate: string | null;
  contractAmount: number;
  daysUntilBilling: number | null;
  isOverdue: boolean;
  status: AmcStatus;
};

export type DashboardLeadFollowUpAlert = {
  id: string;
  leadName: string;
  customerName: string;
  branchName: string;
  phone: string;
  source: string;
  status: LeadStatus;
  nextFollowUpDate: string | null;
  daysUntilFollowUp: number | null;
};

export type DashboardBusinessSummaryResponse = {
  summary: {
    totalOutstandingAmount: number;
    totalOutstandingCount: number;
    overdueOutstandingAmount: number;
    overdueOutstandingCount: number;
    activeAmcCount: number;
    amcExpiringWithin30DaysCount: number;
    expiredAmcCount: number;
    amcPaymentDueCount: number;
    overdueAmcPaymentCount: number;
    leadsThisMonthCount: number;
    leadsConvertedThisMonthCount: number;
    leadConversionPercentage: number;
    followUpsDueTodayCount: number;
    overdueFollowUpsCount: number;
    pendingComplaintsCount: number;
    pendingComplaintsAssignedCount: number;
    todayJobsCount: number;
    technicianAvailability: {
      available: number;
      onJob: number;
      offline: number;
    };
  };
  alerts: {
    overdueOutstanding: DashboardOutstandingAlert[];
    amcExpiringWithin30Days: DashboardAmcExpiringAlert[];
    amcPaymentDue: DashboardAmcPaymentDueAlert[];
    leadsNeedingFollowUp: DashboardLeadFollowUpAlert[];
    pendingComplaints: Array<{
      id: string;
      customerName: string;
      complaintTitle: string;
      status: ComplaintStatus;
      assignedEmployeeId: string | null;
      createdAt: string;
    }>;
  };
  topEmployees: DashboardPerformanceEmployeeRecord[];
  performanceCharts: DashboardPerformanceResponse['charts'];
};

export type DashboardEmployeeSummaryResponse = {
  summary: {
    todayTasks: number;
    overdueTasks: number;
    completedTasks: number;
    pendingTasks: number;
    todayFollowUps: number;
    outstandingCollectionTasks: number;
    assignedLeads: number;
    pendingComplaintsAssigned: number;
  };
  recentTasks: EmployeeTaskRecord[];
  todayFollowUps: DashboardLeadFollowUpAlert[];
  pendingComplaints: Array<{
    id: string;
    customerName: string;
    complaintTitle: string;
    status: ComplaintStatus;
    assignedEmployeeId: string | null;
    createdAt: string;
  }>;
  outstandingTasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    status: TaskStatus;
    sourceSnapshot: Record<string, string | number | null> | null;
  }>;
};

export type DashboardPerformanceEmployeeRecord = {
  employeeId: string;
  employeeName: string;
  username: string;
  role: AppUserRole;
  status: UserStatus;
  leadsAssigned: number;
  leadsConverted: number;
  outstandingCollected: number;
  jobsCompleted: number;
  revenueGenerated: number;
  amcRenewals: number;
  averageResponseTimeHours: number;
  pendingComplaintsAssigned: number;
  todayTasks: number;
  completedTasks: number;
  assignedTaskCount: number;
  technicianPerformance: {
    availability: 'AVAILABLE' | 'ON_JOB' | 'OFFLINE' | null;
    assignedJobs: number;
    completedJobs: number;
    completionRate: number;
  };
};

export type DashboardPerformanceResponse = {
  summary: {
    totalLeadsAssigned: number;
    totalLeadsConverted: number;
    totalOutstandingCollected: number;
    totalJobsCompleted: number;
    totalRevenueGenerated: number;
    totalAmcRenewals: number;
    averageResponseTimeHours: number;
  };
  employees: DashboardPerformanceEmployeeRecord[];
  charts: {
    leadConversion: Array<{ label: string; value: number }>;
    jobsCompleted: Array<{ label: string; value: number }>;
    revenueGenerated: Array<{ label: string; value: number }>;
  };
  technicianAvailability: Array<{
    status: 'AVAILABLE' | 'ON_JOB' | 'OFFLINE';
    count: number;
  }>;
};
