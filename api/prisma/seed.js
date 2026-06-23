const bcrypt = require('bcryptjs');
const {
  PrismaClient,
  Role,
  TechnicianStatus,
  JobStatus,
  AttachmentType,
  SupplierStatus,
  ProductServiceType,
  ProductServiceStatus,
  OutstandingStatus,
  CompanyStatus,
  InvoiceType,
  InvoiceStatus,
  CustomerStatus,
  QuotationStatus,
  AmcBillingPeriod,
  AmcStatus,
} = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password', 10);

  await prisma.invoiceLineItem.deleteMany();
  await prisma.quotationLineItem.deleteMany();
  await prisma.amcInvoice.deleteMany();
  await prisma.amc.deleteMany();
  await prisma.leadStatusHistory.deleteMany();
  await prisma.leadNote.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.invoiceInputField.deleteMany();
  await prisma.outstanding.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.company.deleteMany();
  await prisma.productService.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.jobAttachment.deleteMany();
  await prisma.locationLog.deleteMany();
  await prisma.jobVisit.deleteMany();
  await prisma.job.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  const adminUser = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@example.com',
      password: passwordHash,
      role: Role.ADMIN,
    },
  });

  const technicianUsers = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Rahul Verma',
        email: 'tech@example.com',
        password: passwordHash,
        role: Role.TECHNICIAN,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Anita Das',
        email: 'anita@example.com',
        password: passwordHash,
        role: Role.TECHNICIAN,
      },
    }),
  ]);

  const technicians = await Promise.all([
    prisma.technician.create({
      data: {
        userId: technicianUsers[0].id,
        phone: '+91-9876543210',
        status: TechnicianStatus.AVAILABLE,
        currentLatitude: 12.9715987,
        currentLongitude: 77.5945627,
        lastSeenAt: new Date(),
      },
    }),
    prisma.technician.create({
      data: {
        userId: technicianUsers[1].id,
        phone: '+91-9988776655',
        status: TechnicianStatus.ON_JOB,
        currentLatitude: 12.9351929,
        currentLongitude: 77.6244807,
        lastSeenAt: new Date(),
      },
    }),
  ]);

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Green Valley Apartments',
        phone: '+91-8012345678',
        email: 'accounts@greenvalley.example.com',
        gstin: '29AAACG1234B1Z7',
        address: '12 Lake View Road, Bengaluru',
        billingAddress: '12 Lake View Road, Bengaluru',
        shippingAddress: '12 Lake View Road, Bengaluru',
        placeOfSupply: 'Karnataka',
        latitude: 12.9279232,
        longitude: 77.6271078,
        status: CustomerStatus.ACTIVE,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Sunrise Medical Center',
        phone: '+91-8098765432',
        email: 'finance@sunrise.example.com',
        gstin: '29AAACS9876M1Z2',
        address: '44 Residency Cross, Bengaluru',
        billingAddress: '44 Residency Cross, Bengaluru',
        shippingAddress: '44 Residency Cross, Bengaluru',
        placeOfSupply: 'Karnataka',
        latitude: 12.9755264,
        longitude: 77.6058014,
        status: CustomerStatus.ACTIVE,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Lakeside Tech Park',
        phone: '+91-8080808080',
        email: 'procurement@lakeside.example.com',
        gstin: '29AABCL9087Q1Z9',
        address: '8 Outer Ring Road, Bengaluru',
        billingAddress: '8 Outer Ring Road, Bengaluru',
        shippingAddress: '8 Tower B Service Lane, Bengaluru',
        placeOfSupply: 'Karnataka',
        latitude: 12.9611153,
        longitude: 77.6382145,
        status: CustomerStatus.ACTIVE,
      },
    }),
  ]);

  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        jobNumber: 'JOB-1001',
        title: 'HVAC Preventive Maintenance',
        description: 'Routine preventive maintenance for rooftop HVAC units.',
        customerId: customers[0].id,
        technicianId: technicians[0].id,
        status: JobStatus.ASSIGNED,
        scheduledDate: new Date('2026-06-23T09:00:00.000Z'),
      },
    }),
    prisma.job.create({
      data: {
        jobNumber: 'JOB-1002',
        title: 'Medical Chiller Inspection',
        description: 'Inspect and validate cooling stability for diagnostics wing.',
        customerId: customers[1].id,
        technicianId: technicians[1].id,
        status: JobStatus.STARTED,
        scheduledDate: new Date('2026-06-22T08:00:00.000Z'),
        startedAt: new Date('2026-06-22T08:35:00.000Z'),
      },
    }),
    prisma.job.create({
      data: {
        jobNumber: 'JOB-1003',
        title: 'Backup Generator Diagnostics',
        description: 'Run diagnostics on power backup system after alert notification.',
        customerId: customers[0].id,
        technicianId: technicians[0].id,
        status: JobStatus.PENDING,
        scheduledDate: new Date('2026-06-24T11:00:00.000Z'),
      },
    }),
  ]);

  await prisma.jobVisit.create({
    data: {
      jobId: jobs[1].id,
      technicianId: technicians[1].id,
      checkInAt: new Date('2026-06-22T08:32:00.000Z'),
      startLatitude: 12.9755011,
      startLongitude: 77.6057444,
    },
  });

  await prisma.locationLog.createMany({
    data: [
      {
        technicianId: technicians[0].id,
        jobId: jobs[0].id,
        latitude: 12.9601123,
        longitude: 77.6123456,
        accuracy: 8.4,
        speed: 21.2,
        batteryLevel: 82,
        recordedAt: new Date('2026-06-22T07:55:00.000Z'),
      },
      {
        technicianId: technicians[1].id,
        jobId: jobs[1].id,
        latitude: 12.9749987,
        longitude: 77.6059321,
        accuracy: 4.1,
        speed: 0,
        batteryLevel: 65,
        recordedAt: new Date('2026-06-22T08:40:00.000Z'),
      },
    ],
  });

  await prisma.jobAttachment.createMany({
    data: [
      {
        jobId: jobs[1].id,
        type: AttachmentType.PHOTO,
        fileUrl: 'https://example.com/uploads/job-1002-photo-1.jpg',
      },
      {
        jobId: jobs[1].id,
        type: AttachmentType.SIGNATURE,
        fileUrl: 'https://example.com/uploads/job-1002-signature-1.png',
      },
    ],
  });

  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        supplierName: 'Southline Industrial Services',
        phone: '+91-9001002000',
        email: 'accounts@southline.example.com',
        gstin: '29ABCDE1234F1Z5',
        address: '88 Peenya Industrial Area, Bengaluru',
        bankName: 'HDFC Bank',
        accountNumber: '50200011223344',
        ifscCode: 'HDFC0000123',
        status: SupplierStatus.ACTIVE,
      },
    }),
    prisma.supplier.create({
      data: {
        supplierName: 'Metro Cooling Components',
        phone: '+91-9887766554',
        email: 'billing@metrocooling.example.com',
        gstin: '29FGHIJ5678K2Z6',
        address: '14 Service Road, Kochi',
        bankName: 'ICICI Bank',
        accountNumber: '003405678912',
        ifscCode: 'ICIC0000456',
        status: SupplierStatus.ACTIVE,
      },
    }),
  ]);

  const amcs = await Promise.all([
    prisma.amc.create({
      data: {
        amcNumber: 'AMC-2026-001',
        customerId: customers[1].id,
        customerName: customers[1].name,
        branchId: suppliers[1].id,
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T00:00:00.000Z'),
        durationMonths: 12,
        billingPeriod: AmcBillingPeriod.QUARTERLY,
        billingPeriodMonths: 3,
        contractAmount: 48000,
        taxPercentage: 18,
        status: AmcStatus.ACTIVE,
        lastPaidDate: new Date('2026-06-22T00:00:00.000Z'),
        nextBillingDate: new Date('2026-09-22T00:00:00.000Z'),
        note: 'Quarterly chiller maintenance for diagnostics and storage wing.',
      },
    }),
    prisma.amc.create({
      data: {
        amcNumber: 'AMC-2026-002',
        customerId: customers[0].id,
        customerName: customers[0].name,
        branchId: suppliers[0].id,
        startDate: new Date('2025-07-01T00:00:00.000Z'),
        endDate: new Date('2026-07-10T00:00:00.000Z'),
        durationMonths: 13,
        billingPeriod: AmcBillingPeriod.HALF_YEARLY,
        billingPeriodMonths: 6,
        contractAmount: 78000,
        taxPercentage: 18,
        status: AmcStatus.ACTIVE,
        lastPaidDate: new Date('2026-01-10T00:00:00.000Z'),
        nextBillingDate: new Date('2026-07-01T00:00:00.000Z'),
        note: 'Contract is close to renewal and should be reviewed this month.',
      },
    }),
    prisma.amc.create({
      data: {
        amcNumber: 'AMC-2025-003',
        customerId: customers[2].id,
        customerName: customers[2].name,
        branchId: suppliers[0].id,
        startDate: new Date('2025-01-01T00:00:00.000Z'),
        endDate: new Date('2025-12-31T00:00:00.000Z'),
        durationMonths: 12,
        billingPeriod: AmcBillingPeriod.YEARLY,
        billingPeriodMonths: 12,
        contractAmount: 120000,
        taxPercentage: 18,
        status: AmcStatus.EXPIRED,
        lastPaidDate: new Date('2025-01-01T00:00:00.000Z'),
        nextBillingDate: null,
        note: 'Expired contract retained for historical billing reference.',
      },
    }),
  ]);

  await prisma.productService.createMany({
    data: [
      {
        name: 'Preventive Maintenance Visit',
        type: ProductServiceType.SERVICE,
        description: 'Quarterly HVAC service visit',
        hsnSacCode: '998719',
        unit: 'Visit',
        defaultRate: 9000,
        taxPercentage: 18,
        status: ProductServiceStatus.ACTIVE,
      },
      {
        name: 'Chiller Control Assembly',
        type: ProductServiceType.PRODUCT,
        description: 'Replacement control module with installation',
        hsnSacCode: '841899',
        unit: 'Nos',
        defaultRate: 12400,
        taxPercentage: 18,
        status: ProductServiceStatus.ACTIVE,
      },
      {
        name: 'Annual Maintenance Contract',
        type: ProductServiceType.SERVICE,
        description: 'Comprehensive preventive maintenance for HVAC assets',
        hsnSacCode: '998719',
        unit: 'Contract',
        defaultRate: 25000,
        taxPercentage: 18,
        status: ProductServiceStatus.ACTIVE,
      },
      {
        name: 'Copper Refrigerant Pipe',
        type: ProductServiceType.PRODUCT,
        description: 'Insulated copper pipe for refrigeration systems',
        hsnSacCode: '741110',
        unit: 'Meter',
        defaultRate: 780,
        taxPercentage: 12,
        status: ProductServiceStatus.ACTIVE,
      },
    ],
  });

  const productServices = await prisma.productService.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  await prisma.company.create({
    data: {
      companyName: 'Field Technician Tracker Services',
      phone: '+91-8044556677',
      email: 'billing@fieldtechniciantracker.example.com',
      gstin: '29AABCF4321K1Z8',
      address: '25 Service Hub Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560095',
      country: 'India',
      bankName: 'Axis Bank',
      accountNumber: '9182736455001',
      ifscCode: 'UTIB0001020',
      sealAttachment: null,
      status: CompanyStatus.ACTIVE,
    },
  });

  const proformaInvoice = await prisma.invoice.create({
    data: {
      invoiceType: InvoiceType.PROFORMA,
      invoiceNumber: 'PF-2026-001',
      invoiceDate: new Date('2026-06-22T00:00:00.000Z'),
      supplierId: suppliers[0].id,
      customerId: customers[0].id,
      customerName: 'Green Valley Apartments',
      customerAddress: '12 Lake View Road, Bengaluru',
      customerGstin: '29AAACG1234B1Z7',
      placeOfSupply: 'Karnataka',
      notes: 'Prepared for approval before service execution.',
      termsAndConditions: 'Payment due within 15 days from confirmation.',
      totalBeforeTax: 18000,
      totalTaxAmount: 3240,
      roundedOff: 0,
      totalAmount: 21240,
      amountDue: 21240,
      status: InvoiceStatus.DRAFT,
      lineItems: {
        create: [
          {
            productServiceName: 'Preventive Maintenance Visit',
            description: 'Quarterly HVAC service visit',
            hsnSac: '998719',
            quantity: 2,
            unitPrice: 9000,
            cgstAmount: 1620,
            cgstPercentage: 9,
            sgstAmount: 1620,
            sgstPercentage: 9,
            lineAmount: 21240,
          },
        ],
      },
    },
  });

  const taxInvoice = await prisma.invoice.create({
    data: {
      invoiceType: InvoiceType.TAX,
      invoiceNumber: 'TAX-2026-001',
      invoiceDate: new Date('2026-06-22T00:00:00.000Z'),
      supplierId: suppliers[1].id,
      customerId: customers[1].id,
      customerName: 'Sunrise Medical Center',
      customerAddress: '44 Residency Cross, Bengaluru',
      customerGstin: '29AAACS9876M1Z2',
      placeOfSupply: 'Karnataka',
      notes: 'Includes installation support and commissioning.',
      termsAndConditions: 'Balance due on delivery and completion.',
      totalBeforeTax: 12400,
      totalTaxAmount: 2232,
      roundedOff: -0.32,
      totalAmount: 14631.68,
      amountDue: 4631.68,
      status: InvoiceStatus.ISSUED,
      lineItems: {
        create: [
          {
            productServiceName: 'Chiller Control Assembly',
            description: 'Replacement control module with installation',
            hsnSac: '841899',
            quantity: 1,
            unitPrice: 12400,
            cgstAmount: 1116,
            cgstPercentage: 9,
            sgstAmount: 1116,
            sgstPercentage: 9,
            lineAmount: 14631.68,
          },
        ],
      },
    },
  });

  await prisma.outstanding.createMany({
    data: [
      {
        invoiceId: proformaInvoice.id,
        invoiceType: InvoiceType.PROFORMA,
        invoiceNumber: proformaInvoice.invoiceNumber,
        customerId: customers[0].id,
        customerName: 'Green Valley Apartments',
        invoiceDate: new Date('2026-06-22T00:00:00.000Z'),
        dueDate: new Date('2026-06-22T00:00:00.000Z'),
        totalAmount: 21240,
        paidAmount: 0,
        creditAmount: 0,
        outstandingAmount: 21240,
        status: OutstandingStatus.OVERDUE,
        note: 'Awaiting customer approval for proforma conversion.',
      },
      {
        invoiceId: taxInvoice.id,
        invoiceType: InvoiceType.TAX,
        invoiceNumber: taxInvoice.invoiceNumber,
        customerId: customers[1].id,
        customerName: 'Sunrise Medical Center',
        invoiceDate: new Date('2026-06-22T00:00:00.000Z'),
        dueDate: new Date('2026-06-25T00:00:00.000Z'),
        totalAmount: 14631.68,
        paidAmount: 10000,
        creditAmount: 0,
        outstandingAmount: 4631.68,
        status: OutstandingStatus.PARTIAL,
        note: 'Advance received before final dispatch.',
      },
    ],
  });

  await prisma.amcInvoice.create({
    data: {
      amcId: amcs[0].id,
      invoiceId: taxInvoice.id,
      billingPeriodStart: new Date('2026-06-22T00:00:00.000Z'),
      billingPeriodEnd: new Date('2026-09-21T00:00:00.000Z'),
    },
  });

  await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-001',
      quotationDate: new Date('2026-06-23T00:00:00.000Z'),
      validUntil: new Date('2026-07-07T00:00:00.000Z'),
      supplierId: suppliers[0].id,
      customerId: customers[2].id,
      customerName: 'Lakeside Tech Park',
      customerAddress: '8 Outer Ring Road, Bengaluru',
      customerGstin: '29AABCL9087Q1Z9',
      placeOfSupply: 'Karnataka',
      notes: 'Commercial quotation for annual maintenance contract.',
      termsAndConditions: 'Validity 14 days. Taxes extra where applicable.',
      totalBeforeTax: 25000,
      totalTaxAmount: 4500,
      roundedOff: 0,
      totalAmount: 29500,
      status: QuotationStatus.SENT,
      lineItems: {
        create: [
          {
            productServiceName: 'Annual Maintenance Contract',
            description: 'Comprehensive preventive maintenance for HVAC assets',
            hsnSac: '998719',
            quantity: 1,
            unitPrice: 25000,
            cgstAmount: 2250,
            cgstPercentage: 9,
            sgstAmount: 2250,
            sgstPercentage: 9,
            lineAmount: 29500,
          },
        ],
      },
    },
  });

  await prisma.invoiceInputField.createMany({
    data: [
      {
        section: 'Supplier',
        fieldKey: 'supplier.gstin',
        label: 'Supplier GSTIN',
        inputType: 'text',
        placeholder: 'Auto-filled from supplier master',
        isActive: true,
      },
      {
        section: 'Customer',
        fieldKey: 'customer.billingAddress',
        label: 'Billing Address',
        inputType: 'textarea',
        placeholder: 'Auto-filled from customer master',
        isActive: true,
      },
      {
        section: 'Line Items',
        fieldKey: 'lineItems.hsnSac',
        label: 'HSN / SAC',
        inputType: 'text',
        placeholder: 'Enter HSN or SAC code',
        isActive: true,
      },
      {
        section: 'Totals',
        fieldKey: 'totals.roundedOff',
        label: 'Rounded Off',
        inputType: 'number',
        placeholder: 'Rounded adjustment',
        isActive: true,
      },
    ],
  });

  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        leadName: 'Cold Room Upgrade Opportunity',
        customerName: 'Sunrise Medical Center',
        phone: '+91-9000000011',
        email: 'facilities@sunrise.example.com',
        location: 'Bengaluru',
        branchId: suppliers[1].id,
        branchName: suppliers[1].supplierName,
        source: 'Referral',
        interestedProductServiceId: productServices.find(
          (record) => record.name === 'Annual Maintenance Contract',
        ).id,
        status: 'NEW',
        note: 'Requested a callback for annual maintenance options.',
        nextFollowUpDate: new Date('2026-06-30T00:00:00.000Z'),
      },
    }),
    prisma.lead.create({
      data: {
        leadName: 'Factory Chiller Retrofit',
        customerName: 'Lakeside Tech Park',
        phone: '+91-9444455566',
        email: 'projects@lakeside.example.com',
        location: 'Bengaluru',
        branchId: suppliers[0].id,
        branchName: suppliers[0].supplierName,
        source: 'Website',
        interestedProductServiceId: productServices.find(
          (record) => record.name === 'Chiller Control Assembly',
        ).id,
        status: 'CONTACTED',
        note: 'Requested commercial quote for retrofit scope.',
        nextFollowUpDate: new Date('2026-06-26T00:00:00.000Z'),
      },
    }),
  ]);

  await prisma.leadNote.createMany({
    data: [
      {
        leadId: leads[0].id,
        note: 'Requested a callback for annual maintenance options.',
        createdById: adminUser.id,
        createdByName: adminUser.name,
      },
      {
        leadId: leads[1].id,
        note: 'Requested commercial quote for retrofit scope.',
        createdById: adminUser.id,
        createdByName: adminUser.name,
      },
    ],
  });

  await prisma.leadStatusHistory.createMany({
    data: [
      {
        leadId: leads[0].id,
        status: 'NEW',
        note: 'Requested a callback for annual maintenance options.',
        nextFollowUpDate: new Date('2026-06-30T00:00:00.000Z'),
        changedById: adminUser.id,
        changedByName: adminUser.name,
      },
      {
        leadId: leads[1].id,
        status: 'CONTACTED',
        note: 'Requested commercial quote for retrofit scope.',
        nextFollowUpDate: new Date('2026-06-26T00:00:00.000Z'),
        changedById: adminUser.id,
        changedByName: adminUser.name,
      },
    ],
  });

  console.log('Seed completed');
  console.log(`Admin user: ${adminUser.email}`);
  console.log('Sample login password for seeded users: password');
}

main()
  .catch(async (error) => {
    console.error('Seed failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
