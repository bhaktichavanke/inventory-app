import { put, del } from '@vercel/blob'

const MIME_EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
}

function guessExtension(originalName: string, mimeType: string): string {
  const fromName = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')).toLowerCase() : ''
  if (fromName) return fromName
  return MIME_EXT_MAP[mimeType] || '.jpg'
}

/**
 * Uploads an invoice document (image/PDF) to Vercel Blob storage and returns
 * its public URL. Vercel's serverless functions have an ephemeral, per-invocation
 * filesystem, so files written to disk (even /tmp) are not guaranteed to survive
 * between requests — Blob storage is the durable equivalent for this project.
 */
export async function saveInvoiceFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ url: string; fileName: string; fileType: string }> {
  const ext = guessExtension(originalName, mimeType)
  const safeBase = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 60) || 'invoice'
  const fileName = `${Date.now()}_${safeBase}${ext}`

  const blob = await put(`invoices/${fileName}`, buffer, {
    access: 'public',
    contentType: mimeType,
    addRandomSuffix: true,
  })

  return { url: blob.url, fileName, fileType: mimeType }
}

/**
 * Deletes a previously uploaded invoice file from Blob storage.
 * Safe to call with any string — silently ignores URLs it doesn't recognize
 * (e.g. legacy local file paths from before the Blob migration) and never throws,
 * since a failed cleanup should not block the calling request (e.g. invoice delete).
 */
export async function deleteInvoiceFile(fileUrlOrPath: string | null | undefined): Promise<void> {
  if (!fileUrlOrPath || !fileUrlOrPath.startsWith('http')) return
  try {
    await del(fileUrlOrPath)
  } catch (err) {
    console.warn('Failed to delete blob file (non-fatal):', err)
  }
}
