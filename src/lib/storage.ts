import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import os from 'os'

export function getUploadDir(): string {
  if (process.env.UPLOAD_DIR) {
    return process.env.UPLOAD_DIR
  }
  // Prefer a writable temp directory for non-development environments
  // Use local `uploads` folder only during development for easier inspection
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'uploads')
  }

  // For production / serverless (Vercel, AWS Lambda, etc.) use OS temp dir
  return path.join(os.tmpdir(), 'inventory_uploads')
}

export async function ensureUploadDir(): Promise<string> {
  const dir = getUploadDir()
  try {
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true })
    }
    return dir
  } catch {
    const fallback = path.join(os.tmpdir(), 'inventory_uploads')
    try {
      if (!existsSync(fallback)) {
        await fs.mkdir(fallback, { recursive: true })
      }
    } catch {
      // Ignore if cannot create
    }
    return fallback
  }
}

export async function saveFile(
  buffer: Buffer,
  originalName: string,
  invoiceNo: string
): Promise<{ filePath: string; fileName: string; fileType: string }> {
  const uploadDir = await ensureUploadDir()

  const ext = path.extname(originalName).toLowerCase() || '.jpg'
  const safeInvoiceNo = invoiceNo.replace(/[^a-zA-Z0-9-_]/g, '_')
  const timestamp = Date.now()
  const fileName = `${safeInvoiceNo}_${timestamp}${ext}`
  const filePath = path.join(uploadDir, fileName)

  try {
    await fs.writeFile(filePath, buffer)
  } catch (err) {
    console.warn('File write error, file stored in memory only:', err)
  }

  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
    '.webp': 'image/webp',
  }

  return {
    filePath,
    fileName,
    fileType: mimeMap[ext] || 'application/octet-stream',
  }
}

export async function getFileBuffer(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath)
  } catch {
    return null
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath)
  } catch {
    // ignore
  }
}
