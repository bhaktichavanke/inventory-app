import { z } from 'zod'

// ── Supplier ─────────────────────────────────────────────────────────────────
export const SupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
})

// ── Product ───────────────────────────────────────────────────────────────────
export const ProductSchema = z.object({
  partNo: z.string().min(1, 'Part No. is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().optional(),
  supplierId: z.string().optional(),
  unitPrice: z.number().min(0),
  lowStockThreshold: z.number().min(0).default(5),
  status: z.enum(['ACTIVE', 'DISCONTINUED']).default('ACTIVE'),
})

// ── Invoice Item ───────────────────────────────────────────────────────────────
export const InvoiceItemSchema = z.object({
  partNo: z.string().min(1, 'Part No. is required'),
  description: z.string().min(1),
  quantity: z.number().positive('Quantity must be > 0'),
  unitPrice: z.number().min(0),
  baseAmount: z.number().min(0),
  gstAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
  productId: z.string().optional(),
})

// ── Invoice ───────────────────────────────────────────────────────────────────
export const InvoiceSchema = z.object({
  invoiceNo: z.string().min(1, 'Invoice number is required'),
  poNumber: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  invoiceDate: z.string().optional(),
  baseAmount: z.number().min(0).default(0),
  gstAmount: z.number().min(0).default(0),
  cgst: z.number().min(0).default(0),
  sgst: z.number().min(0).default(0),
  igst: z.number().min(0).default(0),
  otherTax: z.number().min(0).default(0),
  totalAmount: z.number().min(0).default(0),
  receivedDate: z.string().optional(),
  status: z.enum(['RECEIVED', 'NOT_RECEIVED']).default('NOT_RECEIVED'),
  notes: z.string().optional(),
  items: z.array(InvoiceItemSchema).min(1, 'At least one item is required'),
})

// ── Project ───────────────────────────────────────────────────────────────────
export const ProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD']).default('ACTIVE'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// ── Project Component ──────────────────────────────────────────────────────────
export const ProjectComponentSchema = z.object({
  productId: z.string().min(1),
  invoiceId: z.string().optional(),
  quantityUsed: z.number().positive('Quantity must be > 0'),
  dateUsed: z.string().optional(),
  notes: z.string().optional(),
})

// ── Tax Validation ─────────────────────────────────────────────────────────────
export function validateInvoiceTotals(invoice: {
  baseAmount: number
  cgst: number
  sgst: number
  igst: number
  otherTax: number
  totalAmount: number
}): { valid: boolean; expected: number; difference: number } {
  const totalTax = invoice.cgst + invoice.sgst + invoice.igst + invoice.otherTax
  const expected = invoice.baseAmount + totalTax
  const difference = Math.abs(expected - invoice.totalAmount)
  return {
    valid: difference < 0.5,
    expected: Math.round(expected * 100) / 100,
    difference: Math.round(difference * 100) / 100,
  }
}

export type SupplierInput = z.infer<typeof SupplierSchema>
export type ProductInput = z.infer<typeof ProductSchema>
export type InvoiceInput = z.infer<typeof InvoiceSchema>
export type InvoiceItemInput = z.infer<typeof InvoiceItemSchema>
export type ProjectInput = z.infer<typeof ProjectSchema>
export type ProjectComponentInput = z.infer<typeof ProjectComponentSchema>
