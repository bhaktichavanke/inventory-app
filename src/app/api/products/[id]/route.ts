import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        supplier: true,
        invoiceItems: { include: { invoice: true } },
        projectComponents: { include: { project: true, invoice: true } },
        purchaseHistory: {
          include: { invoice: { include: { supplier: true } } },
          orderBy: { date: 'desc' },
        },
        stockMovements: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ ...product, isLowStock: product.currentStock <= product.lowStockThreshold })
  } catch (error) {
    console.error('GET /api/products/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { description, category, supplierId, supplierName, unitPrice, lowStockThreshold, status } = body

    // Auto-create supplier if needed
    let resolvedSupplierId = supplierId
    if (supplierName && !supplierId) {
      const supplier = await prisma.supplier.upsert({
        where: { name: supplierName },
        create: { name: supplierName },
        update: {},
      })
      resolvedSupplierId = supplier.id
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(resolvedSupplierId !== undefined && { supplierId: resolvedSupplierId }),
        ...(unitPrice !== undefined && { unitPrice }),
        ...(lowStockThreshold !== undefined && { lowStockThreshold }),
        ...(status !== undefined && { status }),
      },
      include: { supplier: true },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('PATCH /api/products/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
