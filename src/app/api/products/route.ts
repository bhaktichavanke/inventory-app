import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const status = searchParams.get('status') || ''
    const lowStock = searchParams.get('lowStock') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { partNo: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } },
        { supplier: { name: { contains: search } } },
      ]
    }
    if (category) where.category = category
    if (status) where.status = status
    if (lowStock) {
      where.currentStock = { lte: prisma.product.fields.lowStockThreshold }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { supplier: true },
        orderBy: { partNo: 'asc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    // Mark low-stock items
    const enriched = products.map((p) => ({
      ...p,
      isLowStock: p.currentStock <= p.lowStockThreshold,
    }))

    return NextResponse.json({ products: enriched, total, page, limit })
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { partNo, description, category, supplierId, supplierName, unitPrice, lowStockThreshold, currentStock, status } = body

    if (!partNo || !description) {
      return NextResponse.json({ error: 'partNo and description are required' }, { status: 400 })
    }

    // Auto-create supplier if name provided but no ID
    let resolvedSupplierId = supplierId
    if (supplierName && !supplierId) {
      const supplier = await prisma.supplier.upsert({
        where: { name: supplierName },
        create: { name: supplierName },
        update: {},
      })
      resolvedSupplierId = supplier.id
    }

    // Check for duplicate
    const existing = await prisma.product.findUnique({ where: { partNo } })
    if (existing) {
      return NextResponse.json({ error: `Product with Part No. "${partNo}" already exists`, existing }, { status: 409 })
    }

    const product = await prisma.product.create({
      data: {
        partNo,
        description,
        category: category || null,
        supplierId: resolvedSupplierId || null,
        unitPrice: unitPrice || 0,
        lowStockThreshold: lowStockThreshold ?? 5,
        currentStock: currentStock || 0,
        totalPurchased: currentStock || 0,
        status: status || 'ACTIVE',
      },
      include: { supplier: true },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('POST /api/products error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
