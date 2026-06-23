const bcrypt = require('bcryptjs');
const {
  PrismaClient,
  Role,
  TechnicianStatus,
  JobStatus,
  AttachmentType,
  SupplierStatus,
  InvoiceType,
  InvoiceStatus,
} = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password', 10);

  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
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
        address: '12 Lake View Road, Bengaluru',
        latitude: 12.9279232,
        longitude: 77.6271078,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Sunrise Medical Center',
        phone: '+91-8098765432',
        address: '44 Residency Cross, Bengaluru',
        latitude: 12.9755264,
        longitude: 77.6058014,
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

  await prisma.invoice.create({
    data: {
      invoiceType: InvoiceType.PROFORMA,
      invoiceNumber: 'PF-2026-001',
      invoiceDate: new Date('2026-06-22T00:00:00.000Z'),
      supplierId: suppliers[0].id,
      customerName: 'Green Valley Apartments',
      customerAddress: '12 Lake View Road, Bengaluru',
      customerGstin: '29AAACG1234B1Z7',
      placeOfSupply: 'Karnataka',
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

  await prisma.invoice.create({
    data: {
      invoiceType: InvoiceType.TAX,
      invoiceNumber: 'TAX-2026-001',
      invoiceDate: new Date('2026-06-22T00:00:00.000Z'),
      supplierId: suppliers[1].id,
      customerName: 'Sunrise Medical Center',
      customerAddress: '44 Residency Cross, Bengaluru',
      customerGstin: '29AAACS9876M1Z2',
      placeOfSupply: 'Karnataka',
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
