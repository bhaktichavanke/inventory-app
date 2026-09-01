import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

export interface ExtractedItem {
  partNo: string | null
  description: string | null
  quantity: number | null
  unitPrice: number | null
  baseAmount: number | null
  gstAmount: number | null
  totalAmount: number | null
  flags: {
    partNo?: boolean
    description?: boolean
    quantity?: boolean
    unitPrice?: boolean
    baseAmount?: boolean
    gstAmount?: boolean
    totalAmount?: boolean
  }
}

export interface ExtractionResult {
  invoiceNo: string | null
  poNumber: string | null
  invoiceDate: string | null
  supplierName: string | null
  baseAmount: number | null
  gstAmount: number | null
  cgst: number | null
  sgst: number | null
  igst: number | null
  otherTax: number | null
  totalAmount: number | null
  items: ExtractedItem[]
  flags: {
    invoiceNo?: boolean
    poNumber?: boolean
    invoiceDate?: boolean
    supplierName?: boolean
    baseAmount?: boolean
    gstAmount?: boolean
    totalAmount?: boolean
  }
  rawText?: string
  error?: string
}

const EXTRACTION_PROMPT = `You are an expert invoice data extractor. Analyze this invoice image/document and extract all information in valid JSON format.

IMPORTANT RULES:
1. Extract ALL line items — the invoice may have multiple products
2. If you are UNCERTAIN about a field, set its value to null and add the field name to the "flags" object with value true
3. For Indian invoices: look for CGST, SGST, IGST separately
4. For amounts: return numbers only (no currency symbols, commas, or spaces)
5. For dates: return as YYYY-MM-DD format
6. For quantities: return as numbers
7. Do NOT guess — return null if you cannot read a value clearly

Return ONLY this JSON structure (no markdown, no explanation):
{
  "invoiceNo": "string or null",
  "poNumber": "string or null",
  "invoiceDate": "YYYY-MM-DD or null",
  "supplierName": "string or null",
  "baseAmount": number or null,
  "gstAmount": number or null,
  "cgst": number or null,
  "sgst": number or null,
  "igst": number or null,
  "otherTax": number or null,
  "totalAmount": number or null,
  "flags": {
    "fieldName": true
  },
  "items": [
    {
      "partNo": "string or null",
      "description": "string or null",
      "quantity": number or null,
      "unitPrice": number or null,
      "baseAmount": number or null,
      "gstAmount": number or null,
      "totalAmount": number or null,
      "flags": {
        "fieldName": true
      }
    }
  ]
}`

export async function extractInvoiceData(
  imageInput: string | Buffer,
  mimeType: string,
  apiKey?: string
): Promise<ExtractionResult> {
  const key = apiKey || process.env.GEMINI_API_KEY
  const openAiKey = process.env.OPENAI_API_KEY
  const imageBuffer = Buffer.isBuffer(imageInput)
    ? imageInput
    : await fs.readFile(imageInput)

  // OpenAI is the preferred provider when configured. Unlike the former
  // fallback, this sends the invoice as a real image/PDF input—not Base64 text.
  if (openAiKey) {
    try {
      return await extractWithOpenAI(imageBuffer, mimeType, openAiKey)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn('OpenAI invoice extraction failed; trying Gemini:', message)
    }
  }

  // If a Google service account JSON is provided in env, write it to a temp file
  // and set GOOGLE_APPLICATION_CREDENTIALS so the SDK can use it.
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (saJson) {
    try {
      const saPath = path.join(os.tmpdir(), `gcloud-sa-${Date.now()}.json`)
      await fs.writeFile(saPath, saJson, { encoding: 'utf8' })
      process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath
    } catch (e) {
      console.warn('Failed to write Google service account JSON to temp file', e)
    }
  }

  if (!key && !saJson) {
    return extractionError('No AI provider is configured. Add OPENAI_API_KEY or a valid GEMINI_API_KEY in the Vercel environment variables.')
  }

  try {
    const genAI = new GoogleGenerativeAI(key ?? '')
    
    // Model fallback sequence to ensure compatibility across API versions
    const modelNames = [
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro',
    ]

    const base64Image = imageBuffer.toString('base64')
    // Gemini supports application/pdf, image/jpeg, image/png, image/webp natively
    const effectiveMime = mimeType || (base64Image.startsWith('JVBERi0') ? 'application/pdf' : 'image/jpeg')

    const imagePart: Part = {
      inlineData: {
        data: base64Image,
        mimeType: effectiveMime,
      },
    }

    let text = ''
    let lastError: Error | null = null

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent([EXTRACTION_PROMPT, imagePart])
        text = result.response.text()
        if (text) break // Succeeded!
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e))
        console.warn(`Gemini model "${modelName}" failed, trying next fallback...`, lastError.message)
      }
    }

    if (!text) {
      if (lastError) {
        throw lastError
      }
      throw new Error('No AI response produced')
    }

    return parseExtraction(text)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return extractionError(`AI extraction failed: ${message}`)
  }
}

async function extractWithOpenAI(
  buffer: Buffer,
  mimeType: string,
  apiKey: string
): Promise<ExtractionResult> {
  const effectiveMime = mimeType || (buffer.subarray(0, 4).toString() === '%PDF' ? 'application/pdf' : 'image/jpeg')
  const base64 = buffer.toString('base64')
  const documentInput = effectiveMime === 'application/pdf'
    ? { type: 'input_file', filename: 'invoice.pdf', file_data: `data:application/pdf;base64,${base64}` }
    : { type: 'input_image', image_url: `data:${effectiveMime};base64,${base64}`, detail: 'high' }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_INVOICE_MODEL || 'gpt-4o-mini',
      input: [{ role: 'user', content: [{ type: 'input_text', text: EXTRACTION_PROMPT }, documentInput] }],
      text: { format: { type: 'json_object' } },
      temperature: 0,
      store: false,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 500)}`)
  }

  const payload = (await response.json()) as {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  }
  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === 'output_text')?.text

  if (!text) throw new Error('OpenAI returned no extraction text')
  return parseExtraction(text)
}

function parseExtraction(text: string): ExtractionResult {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(cleaned) as ExtractionResult
  parsed.rawText = text
  if (!parsed.items) parsed.items = []
  if (!parsed.flags) parsed.flags = {}
  parsed.items = parsed.items.map((item) => ({ ...item, flags: item.flags || {} }))
  return parsed
}

function extractionError(error: string): ExtractionResult {
  return {
    invoiceNo: null, poNumber: null, invoiceDate: null, supplierName: null,
    baseAmount: null, gstAmount: null, cgst: null, sgst: null, igst: null,
    otherTax: null, totalAmount: null, items: [], flags: {}, error,
  }
}
