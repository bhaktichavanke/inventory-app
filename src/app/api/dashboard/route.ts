import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [
      totalProducts,
      lowStockProducts,
      totalInvoices,
      receivedInvoices,
      notReceivedInvoices,
      activeProjects,
      recentProducts,
      recentInvoices,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, currentStock: true, lowStockThreshold: true },
      }).then(products => products.filter(p => p.currentStock <= p.lowStockThreshold).length),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: 'RECEIVED' } }),
      prisma.invoice.count({ where: { status: 'NOT_RECEIVED' } }),
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.product.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { supplier: true },
      }),
      prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { supplier: true },
      }),
    ])

    const totalInventoryValue = await prisma.product.aggregate({
      _sum: { currentStock: true },
    })

    return NextResponse.json({
      totalProducts,
      totalInventoryItems: totalInventoryValue._sum.currentStock || 0,
      lowStockProducts,
      totalInvoices,
      receivedInvoices,
      notReceivedInvoices,
      activeProjects,
      recentProducts,
      recentInvoices,
    })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
