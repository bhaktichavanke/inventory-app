import { NextRequest, NextResponse } from 'next/server'
import {
  exportInventory,
  exportProductMaster,
  exportInvoices,
  exportPurchaseHistory,
  exportProjectComponents,
  importProductsFromExcel,
} from '@/lib/excel'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'inventory'

    let buffer: Buffer
    let filename: string

    switch (type) {
      case 'inventory':
        buffer = await exportInventory()
        filename = `inventory_${formatDate()}.xlsx`
        break
      case 'products':
        buffer = await exportProductMaster()
        filename = `product_master_${formatDate()}.xlsx`
        break
      case 'invoices':
        buffer = await exportInvoices()
        filename = `invoices_${formatDate()}.xlsx`
        break
      case 'purchase_history':
        buffer = await exportPurchaseHistory()
        filename = `purchase_history_${formatDate()}.xlsx`
        break
      case 'project_components':
        buffer = await exportProjectComponents()
        filename = `project_components_${formatDate()}.xlsx`
        break
      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Excel export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const result = await importProductsFromExcel(buffer)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Excel import error:', error)
    return NextResponse.json({ error: 'Import failed: ' + (error instanceof Error ? error.message : 'Unknown') }, { status: 500 })
  }
}

function formatDate() {
  return new Date().toISOString().split('T')[0]
}
