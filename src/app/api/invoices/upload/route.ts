import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { extractInvoiceData } from '@/lib/ai-extractor'
import { prisma } from '@/lib/db'
import { ensureUploadDir } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    const fileType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file type. Upload JPG, PNG, WebP, or PDF.' }, { status: 400 })
    }

    // Get uploads directory in a safe writable path (e.g. /tmp on Vercel)
    const uploadDir = await ensureUploadDir()
    const ext = path.extname(file.name) || (fileType === 'application/pdf' ? '.pdf' : '.jpg')
    const tempName = `temp_${Date.now()}${ext}`
    const tempPath = path.join(uploadDir, tempName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save temporary file safely (if disk is writable)
    try {
      await writeFile(tempPath, buffer)
    } catch (writeErr) {
      console.warn('Could not persist file to disk, proceeding with memory buffer:', writeErr)
    }

    // Get Gemini API key from settings or env
    const settings = await prisma.appSettings.findUnique({ where: { id: 'settings' } }).catch(() => null)
    const apiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY

    // Run AI extraction directly with in-memory buffer
    const extracted = await extractInvoiceData(buffer, fileType, apiKey || undefined)

    return NextResponse.json({
      extracted,
      tempFilePath: tempPath,
      tempFileName: tempName,
      fileType: fileType,
      originalName: file.name,
    })
  } catch (error) {
    console.error('POST /api/invoices/upload error:', error)
    return NextResponse.json({ error: 'Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
  }
}
