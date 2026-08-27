import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''

    if (q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const [products, invoices, projects] = await Promise.all([
      prisma.product.findMany({
        where: {
          OR: [
            { partNo: { contains: q } },
            { description: { contains: q } },
            { category: { contains: q } },
          ],
        },
        include: { supplier: true },
        take: 10,
      }),
      prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNo: { contains: q } },
            { poNumber: { contains: q } },
            { supplier: { name: { contains: q } } },
          ],
        },
        include: { supplier: true },
        take: 10,
      }),
      prisma.project.findMany({
        where: { name: { contains: q } },
        take: 5,
      }),
    ])

    return NextResponse.json({
      results: {
        products: products.map((p) => ({
          type: 'product',
          id: p.id,
          label: `${p.partNo} — ${p.description}`,
          sublabel: p.supplier?.name,
          url: `/products/${p.id}`,
          isLowStock: p.currentStock <= p.lowStockThreshold,
        })),
        invoices: invoices.map((inv) => ({
          type: 'invoice',
          id: inv.id,
          label: inv.invoiceNo,
          sublabel: `${inv.supplier?.name || ''} · ₹${inv.totalAmount.toLocaleString('en-IN')}`,
          url: `/invoices/${inv.id}`,
          status: inv.status,
        })),
        projects: projects.map((p) => ({
          type: 'project',
          id: p.id,
          label: p.name,
          sublabel: p.status,
          url: `/projects/${p.id}`,
        })),
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
