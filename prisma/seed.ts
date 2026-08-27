import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with sample data...')

  // ── Suppliers ──────────────────────────────────────────────────────────────
  const roboSupplies = await prisma.supplier.upsert({
    where: { name: 'RoboSupplies India' },
    update: {},
    create: {
      name: 'RoboSupplies India',
      email: 'sales@robosupplies.in',
      phone: '+91-80-12345678',
      address: '42, Electronics City, Bengaluru - 560100',
      gstin: '29AAAAA0000A1Z5',
    },
  })

  const techMart = await prisma.supplier.upsert({
    where: { name: 'TechMart Components' },
    update: {},
    create: {
      name: 'TechMart Components',
      email: 'orders@techmart.in',
      phone: '+91-22-98765432',
      address: '15, Lamington Road, Mumbai - 400004',
      gstin: '27BBBBB0000B1Z3',
    },
  })

  // ── Products ───────────────────────────────────────────────────────────────
  const products = [
    { partNo: 'MTR-001', description: 'DC Motor 12V 300RPM', category: 'Motors', supplierId: roboSupplies.id, unitPrice: 450, currentStock: 8, totalPurchased: 20, totalUsed: 12 },
    { partNo: 'ESP-032', description: 'ESP32 Development Board', category: 'Microcontrollers', supplierId: techMart.id, unitPrice: 350, currentStock: 15, totalPurchased: 25, totalUsed: 10 },
    { partNo: 'MD-005', description: 'L298N Motor Driver Module', category: 'Drivers', supplierId: roboSupplies.id, unitPrice: 180, currentStock: 4, totalPurchased: 10, totalUsed: 6 },
    { partNo: 'SNS-001', description: 'HC-SR04 Ultrasonic Sensor', category: 'Sensors', supplierId: techMart.id, unitPrice: 95, currentStock: 12, totalPurchased: 20, totalUsed: 8 },
    { partNo: 'BAT-18650', description: 'Li-Ion Battery 18650 3.7V 2600mAh', category: 'Power', supplierId: roboSupplies.id, unitPrice: 220, currentStock: 3, totalPurchased: 30, totalUsed: 27, lowStockThreshold: 5 },
    { partNo: 'BRD-001', description: 'Breadboard 830 Tie Points', category: 'Prototyping', supplierId: techMart.id, unitPrice: 75, currentStock: 10, totalPurchased: 15, totalUsed: 5 },
    { partNo: 'RES-10K', description: '10K Ohm Resistor (Pack of 100)', category: 'Passive', supplierId: techMart.id, unitPrice: 30, currentStock: 20, totalPurchased: 30, totalUsed: 10 },
    { partNo: 'CAP-100UF', description: '100uF Electrolytic Capacitor (Pack of 50)', category: 'Passive', supplierId: techMart.id, unitPrice: 45, currentStock: 2, totalPurchased: 10, totalUsed: 8, lowStockThreshold: 3 },
  ]

  const createdProducts: Record<string, string> = {}
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { partNo: p.partNo },
      update: {},
      create: {
        ...p,
        lowStockThreshold: p.lowStockThreshold ?? 5,
        lastPurchaseDate: new Date('2025-03-15'),
      },
    })
    createdProducts[p.partNo] = product.id
  }

  // ── Invoices ───────────────────────────────────────────────────────────────
  const inv1 = await prisma.invoice.upsert({
    where: { invoiceNo: 'INV-1024' },
    update: {},
    create: {
      invoiceNo: 'INV-1024',
      poNumber: 'PO-2025-001',
      supplierId: roboSupplies.id,
      invoiceDate: new Date('2025-03-10'),
      baseAmount: 9000,
      cgst: 810,
      sgst: 810,
      igst: 0,
      otherTax: 0,
      gstAmount: 1620,
      totalAmount: 10620,
      receivedDate: new Date('2025-03-15'),
      status: 'RECEIVED',
      items: {
        create: [
          { partNo: 'MTR-001', description: 'DC Motor 12V 300RPM', quantity: 10, unitPrice: 450, baseAmount: 4500, gstAmount: 810, totalAmount: 5310, productId: createdProducts['MTR-001'] },
          { partNo: 'MD-005', description: 'L298N Motor Driver Module', quantity: 5, unitPrice: 180, baseAmount: 900, gstAmount: 162, totalAmount: 1062, productId: createdProducts['MD-005'] },
          { partNo: 'BAT-18650', description: 'Li-Ion Battery 18650', quantity: 15, unitPrice: 220, baseAmount: 3300, gstAmount: 594, totalAmount: 3894, productId: createdProducts['BAT-18650'] },
        ],
      },
    },
  })

  const inv2 = await prisma.invoice.upsert({
    where: { invoiceNo: 'INV-1027' },
    update: {},
    create: {
      invoiceNo: 'INV-1027',
      poNumber: 'PO-2025-003',
      supplierId: techMart.id,
      invoiceDate: new Date('2025-03-20'),
      baseAmount: 11025,
      cgst: 992.25,
      sgst: 992.25,
      igst: 0,
      otherTax: 0,
      gstAmount: 1984.5,
      totalAmount: 13009.5,
      receivedDate: new Date('2025-03-25'),
      status: 'RECEIVED',
      items: {
        create: [
          { partNo: 'ESP-032', description: 'ESP32 Development Board', quantity: 15, unitPrice: 350, baseAmount: 5250, gstAmount: 945, totalAmount: 6195, productId: createdProducts['ESP-032'] },
          { partNo: 'SNS-001', description: 'HC-SR04 Ultrasonic Sensor', quantity: 10, unitPrice: 95, baseAmount: 950, gstAmount: 171, totalAmount: 1121, productId: createdProducts['SNS-001'] },
          { partNo: 'BRD-001', description: 'Breadboard 830 Tie Points', quantity: 10, unitPrice: 75, baseAmount: 750, gstAmount: 135, totalAmount: 885, productId: createdProducts['BRD-001'] },
          { partNo: 'RES-10K', description: '10K Ohm Resistor Pack', quantity: 15, unitPrice: 30, baseAmount: 450, gstAmount: 81, totalAmount: 531, productId: createdProducts['RES-10K'] },
          { partNo: 'CAP-100UF', description: '100uF Capacitor Pack', quantity: 5, unitPrice: 45, baseAmount: 225, gstAmount: 40.5, totalAmount: 265.5, productId: createdProducts['CAP-100UF'] },
          { partNo: 'ESP-032', description: 'ESP32 Development Board (additional)', quantity: 10, unitPrice: 350, baseAmount: 3500, gstAmount: 630, totalAmount: 4130, productId: createdProducts['ESP-032'] },
        ],
      },
    },
  })

  await prisma.invoice.upsert({
    where: { invoiceNo: 'INV-1030' },
    update: {},
    create: {
      invoiceNo: 'INV-1030',
      poNumber: 'PO-2025-007',
      supplierId: roboSupplies.id,
      invoiceDate: new Date('2025-04-05'),
      baseAmount: 4500,
      cgst: 0,
      sgst: 0,
      igst: 405,
      otherTax: 0,
      gstAmount: 405,
      totalAmount: 4905,
      status: 'NOT_RECEIVED',
      items: {
        create: [
          { partNo: 'MTR-001', description: 'DC Motor 12V 300RPM', quantity: 10, unitPrice: 450, baseAmount: 4500, gstAmount: 405, totalAmount: 4905, productId: createdProducts['MTR-001'] },
        ],
      },
    },
  })

  // ── Purchase History ───────────────────────────────────────────────────────
  const purchaseHistoryData = [
    { productId: createdProducts['MTR-001'], invoiceId: inv1.id, quantity: 10, unitPrice: 450, date: new Date('2025-03-15') },
    { productId: createdProducts['MD-005'], invoiceId: inv1.id, quantity: 5, unitPrice: 180, date: new Date('2025-03-15') },
    { productId: createdProducts['BAT-18650'], invoiceId: inv1.id, quantity: 15, unitPrice: 220, date: new Date('2025-03-15') },
    { productId: createdProducts['ESP-032'], invoiceId: inv2.id, quantity: 25, unitPrice: 350, date: new Date('2025-03-25') },
    { productId: createdProducts['SNS-001'], invoiceId: inv2.id, quantity: 10, unitPrice: 95, date: new Date('2025-03-25') },
    { productId: createdProducts['BRD-001'], invoiceId: inv2.id, quantity: 10, unitPrice: 75, date: new Date('2025-03-25') },
    { productId: createdProducts['RES-10K'], invoiceId: inv2.id, quantity: 15, unitPrice: 30, date: new Date('2025-03-25') },
    { productId: createdProducts['CAP-100UF'], invoiceId: inv2.id, quantity: 5, unitPrice: 45, date: new Date('2025-03-25') },
  ]

  for (const ph of purchaseHistoryData) {
    await prisma.purchaseHistory.create({ data: ph })
  }

  // ── Project ────────────────────────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { id: 'sample-robot-project' },
    update: {},
    create: {
      id: 'sample-robot-project',
      name: 'Autonomous Robot v1',
      description: 'Four-wheel autonomous robot with ultrasonic obstacle avoidance',
      status: 'ACTIVE',
      startDate: new Date('2025-04-01'),
    },
  })

  // ── Project Components ─────────────────────────────────────────────────────
  for (const comp of [
    { projectId: project.id, productId: createdProducts['MTR-001'], invoiceId: inv1.id, quantityUsed: 4, dateUsed: new Date('2025-04-02'), notes: 'Four drive motors' },
    { projectId: project.id, productId: createdProducts['ESP-032'], invoiceId: inv2.id, quantityUsed: 2, dateUsed: new Date('2025-04-02'), notes: 'Main controller + WiFi module' },
    { projectId: project.id, productId: createdProducts['MD-005'], invoiceId: inv1.id, quantityUsed: 2, dateUsed: new Date('2025-04-02'), notes: 'Front and rear motor drivers' },
    { projectId: project.id, productId: createdProducts['SNS-001'], invoiceId: inv2.id, quantityUsed: 3, dateUsed: new Date('2025-04-03'), notes: 'Front, left, right sensors' },
    { projectId: project.id, productId: createdProducts['BAT-18650'], invoiceId: inv1.id, quantityUsed: 6, dateUsed: new Date('2025-04-03'), notes: '2S3P battery pack' },
  ]) {
    await prisma.projectComponent.create({ data: comp })
  }

  console.log('✅ Seeding complete!')
  console.log(`   Suppliers: 2`)
  console.log(`   Products: ${products.length}`)
  console.log(`   Invoices: 3`)
  console.log(`   Projects: 1`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
