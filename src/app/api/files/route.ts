import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { getUploadDir } from '@/lib/storage'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'No path provided' }, { status: 400 })
    }

    // Security: only serve files from uploads directory (use shared helper)
    const uploadDir = process.env.UPLOAD_DIR || getUploadDir()
    const resolved = path.resolve(filePath)
    if (!resolved.startsWith(path.resolve(uploadDir))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!existsSync(resolved)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const buffer = await readFile(resolved)
    const ext = path.extname(resolved).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.webp': 'image/webp',
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
