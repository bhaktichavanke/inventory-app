import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

export async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export async function saveFile(
  buffer: Buffer,
  originalName: string,
  invoiceNo: string
): Promise<{ filePath: string; fileName: string; fileType: string }> {
  await ensureUploadDir()

  const ext = path.extname(originalName).toLowerCase()
  const safeInvoiceNo = invoiceNo.replace(/[^a-zA-Z0-9-_]/g, '_')
  const timestamp = Date.now()
  const fileName = `${safeInvoiceNo}_${timestamp}${ext}`
  const filePath = path.join(UPLOAD_DIR, fileName)

  await fs.writeFile(filePath, buffer)

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
