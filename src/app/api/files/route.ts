import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Legacy file-serving endpoint.
 *
 * Invoice documents are now stored in Vercel Blob storage and referenced by
 * their full public URL (`invoice.filePath` starts with "http"), so the
 * frontend links to that URL directly and this route is no longer used for
 * new uploads. It's kept only to redirect any pre-migration records that
 * still have a Blob URL saved, and to return a clear error for anything else
 * (e.g. old local /tmp paths from before the migration, which never
 * persisted across serverless invocations and can't be served).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const filePath = searchParams.get('path')

  if (!filePath) {
    return NextResponse.json({ error: 'No path provided' }, { status: 400 })
  }

  if (filePath.startsWith('http')) {
    return NextResponse.redirect(filePath)
  }

  return NextResponse.json(
    { error: 'This file was stored on the local filesystem before the Blob storage migration and is no longer available.' },
    { status: 410 }
  )
}
