import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'settings' } })
    if (!settings) {
      return NextResponse.json({ geminiApiKey: '', lowStockThreshold: 5, currency: 'INR' })
    }
    // Don't expose the actual API key, just whether it's set
    return NextResponse.json({
      geminiApiKeySet: !!settings.geminiApiKey,
      lowStockThreshold: settings.lowStockThreshold,
      currency: settings.currency,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const settings = await prisma.appSettings.upsert({
      where: { id: 'settings' },
      create: {
        id: 'settings',
        geminiApiKey: body.geminiApiKey || null,
        lowStockThreshold: body.lowStockThreshold ?? 5,
        currency: body.currency || 'INR',
      },
      update: {
        ...(body.geminiApiKey !== undefined && { geminiApiKey: body.geminiApiKey }),
        ...(body.lowStockThreshold !== undefined && { lowStockThreshold: body.lowStockThreshold }),
        ...(body.currency !== undefined && { currency: body.currency }),
      },
    })
    return NextResponse.json({ success: true, geminiApiKeySet: !!settings.geminiApiKey })
  } catch {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}