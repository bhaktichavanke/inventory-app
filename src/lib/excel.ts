import * as XLSX from 'xlsx'
import { prisma } from './db'

// ── Export Functions ───────────────────────────────────────────────────────────

export async function exportInventory(): Promise<Buffer> {
  const products = await prisma.product.findMany({
    include: { supplier: true },
    orderBy: { partNo: 'asc' },
  })

  const rows = products.map((p) => ({
    'Part No.': p.partNo,
    'Description': p.description,
    'Category': p.category || '',
    'Supplier': p.supplier?.name || '',
    'Current Stock': p.currentStock,
    'Total Purchased': p.totalPurchased,
    'Total Used': p.totalUsed,
    'Unit Price (₹)': p.unitPrice,
    'Low Stock Threshold': p.lowStockThreshold,
    'Last Purchase Date': p.lastPurchaseDate
      ? p.lastPurchaseDate.toISOString().split('T')[0]
      : '',
    'Status': p.status,
  }))

  return buildWorkbook({ Inventory: rows })
}

export async function exportProductMaster(): Promise<Buffer> {
  const products = await prisma.product.findMany({
    include: {
      supplier: true,
      purchaseHistory: { include: { invoice: true }, orderBy: { date: 'desc' }, take: 1 },
    },
    orderBy: { partNo: 'asc' },
  })

  const rows = products.map((p) => ({
    'Part No.': p.partNo,
    'Description': p.description,
    'Category': p.category || '',
    'Supplier': p.supplier?.name || '',
    'Current Stock': p.currentStock,
    'Total Purchased': p.totalPurchased,
    'Total Used': p.totalUsed,
    'Unit Price (₹)': p.unitPrice,
    'Last Purchase Date': p.lastPurchaseDate
      ? p.lastPurchaseDate.toISOString().split('T')[0]
      : '',
    'Last Invoice No.': p.purchaseHistory[0]?.invoice?.invoiceNo || '',
    'Status': p.status,
  }))

  return buildWorkbook({ 'Product Master': rows })
}

export async function exportInvoices(): Promise<Buffer> {
  const invoices = await prisma.invoice.findMany({
    include: { supplier: true, items: true },
    orderBy: { createdAt: 'desc' },
  })

  const rows = invoices.map((inv) => ({
    'Invoice No.': inv.invoiceNo,
    'PO Number': inv.poNumber || '',
    'Supplier': inv.supplier?.name || '',
    'Invoice Date': inv.invoiceDate ? inv.invoiceDate.toISOString().split('T')[0] : '',
    'Base Amount (₹)': inv.baseAmount,
    'CGST (₹)': inv.cgst,
    'SGST (₹)': inv.sgst,
    'IGST (₹)': inv.igst,
    'Other Tax (₹)': inv.otherTax,
    'Total Amount (₹)': inv.totalAmount,
    'Received Date': inv.receivedDate ? inv.receivedDate.toISOString().split('T')[0] : '',
    'Status': inv.status,
    'Items Count': inv.items.length,
  }))

  return buildWorkbook({ Invoices: rows })
}

export async function exportPurchaseHistory(): Promise<Buffer> {
  const history = await prisma.purchaseHistory.findMany({
    include: { product: true, invoice: { include: { supplier: true } } },
    orderBy: { date: 'desc' },
  })

  const rows = history.map((h) => ({
    'Part No.': h.product.partNo,
    'Description': h.product.description,
    'Invoice No.': h.invoice.invoiceNo,
    'PO Number': h.invoice.poNumber || '',
    'Supplier': h.invoice.supplier?.name || '',
    'Quantity': h.quantity,
    'Unit Price (₹)': h.unitPrice,
    'Total (₹)': h.quantity * h.unitPrice,
    'Purchase Date': h.date.toISOString().split('T')[0],
  }))

  return buildWorkbook({ 'Purchase History': rows })
}

export async function exportProjectComponents(): Promise<Buffer> {
  const components = await prisma.projectComponent.findMany({
    include: {
      project: true,
      product: true,
      invoice: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const rows = components.map((c) => ({
    'Project': c.project.name,
    'Part No.': c.product.partNo,
    'Description': c.product.description,
    'Quantity Used': c.quantityUsed,
    'Invoice No.': c.invoice?.invoiceNo || '',
    'Date Used': c.dateUsed.toISOString().split('T')[0],
    'Notes': c.notes || '',
  }))

  return buildWorkbook({ 'Project Components': rows })
}

// ── Import Function ────────────────────────────────────────────────────────────

export interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

export async function importProductsFromExcel(buffer: Buffer): Promise<ImportResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    try {
      const partNo = String(
        row['Part No.'] || row['PartNo'] || row['part_no'] || row['Part Number'] || ''
      ).trim()
      const description = String(
        row['Description'] || row['Item Description'] || row['description'] || ''
      ).trim()

      if (!partNo) {
        result.skipped++
        continue
      }
      if (!description) {
        result.errors.push(`Row ${rowNum}: Part No. "${partNo}" has no description`)
        result.skipped++
        continue
      }

      const category = String(row['Category'] || row['category'] || '').trim()
      const supplierName = String(
        row['Supplier'] || row['Supplier Name'] || row['supplier'] || ''
      ).trim()
      const unitPrice = parseFloat(String(row['Unit Price'] || row['Unit Price (₹)'] || '0')) || 0
      const currentStock =
        parseFloat(String(row['Current Stock'] || row['Stock'] || row['stock'] || '0')) || 0
      const lowStockThreshold =
        parseFloat(String(row['Low Stock Threshold'] || '5')) || 5

      let supplierId: string | undefined
      if (supplierName) {
        const supplier = await prisma.supplier.upsert({
          where: { name: supplierName },
          create: { name: supplierName },
          update: {},
        })
        supplierId = supplier.id
      }

      const existing = await prisma.product.findUnique({ where: { partNo } })

      if (existing) {
        await prisma.product.update({
          where: { partNo },
          data: {
            description,
            category: category || existing.category,
            supplierId: supplierId || existing.supplierId,
            unitPrice: unitPrice || existing.unitPrice,
            lowStockThreshold,
            updatedAt: new Date(),
          },
        })
        result.updated++
      } else {
        await prisma.product.create({
          data: {
            partNo,
            description,
            category,
            supplierId,
            unitPrice,
            currentStock,
            totalPurchased: currentStock,
            totalUsed: 0,
            lowStockThreshold,
          },
        })
        result.created++
      }
    } catch (err) {
      result.errors.push(`Row ${rowNum}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return result
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildWorkbook(sheets: Record<string, Record<string, unknown>[]>): Buffer {
  const wb = XLSX.utils.book_new()

  for (const [name, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(rows)

    const colWidths = rows.reduce<Record<number, number>>((acc, row) => {
      Object.values(row).forEach((val, i) => {
        const len = String(val).length
        acc[i] = Math.max(acc[i] || 10, Math.min(len + 2, 50))
      })
      return acc
    }, {})
    ws['!cols'] = Object.values(colWidths).map((w) => ({ wch: w }))

    XLSX.utils.book_append_sheet(wb, ws, name)
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return Buffer.from(buf)
}
