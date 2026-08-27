import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { extractInvoiceData } from '@/lib/ai-extractor'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Upload JPG, PNG, WebP, or PDF.' }, { status: 400 })
    }

    // Save file to uploads directory
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const ext = path.extname(file.name) || '.jpg'
    const tempName = `temp_${Date.now()}${ext}`
    const tempPath = path.join(uploadDir, tempName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(tempPath, buffer)

    // Get Gemini API key from settings or env
    const settings = await prisma.appSettings.findUnique({ where: { id: 'settings' } }).catch(() => null)
    const apiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY

    // Run AI extraction
    const extracted = await extractInvoiceData(tempPath, file.type, apiKey || undefined)

    return NextResponse.json({
      extracted,
      tempFilePath: tempPath,
      tempFileName: tempName,
      fileType: file.type,
      originalName: file.name,
    })
  } catch (error) {
    console.error('POST /api/invoices/upload error:', error)
    return NextResponse.json({ error: 'Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
  }
}
