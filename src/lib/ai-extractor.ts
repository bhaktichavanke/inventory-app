import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import fs from 'fs/promises'

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
  imagePath: string,
  mimeType: string,
  apiKey?: string
): Promise<ExtractionResult> {
  const key = apiKey || process.env.GEMINI_API_KEY
  if (!key) {
    return {
      invoiceNo: null,
      poNumber: null,
      invoiceDate: null,
      supplierName: null,
      baseAmount: null,
      gstAmount: null,
      cgst: null,
      sgst: null,
      igst: null,
      otherTax: null,
      totalAmount: null,
      items: [],
      flags: {},
      error: 'GEMINI_API_KEY not configured. Please add your API key in Settings.',
    }
  }

  try {
    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const imageBuffer = await fs.readFile(imagePath)
    const base64Image = imageBuffer.toString('base64')

    const effectiveMime = mimeType === 'application/pdf' ? 'image/png' : mimeType

    const imagePart: Part = {
      inlineData: {
        data: base64Image,
        mimeType: effectiveMime as 'image/jpeg' | 'image/png' | 'image/webp',
      },
    }

    const result = await model.generateContent([EXTRACTION_PROMPT, imagePart])
    const text = result.response.text()

    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const parsed = JSON.parse(cleaned) as ExtractionResult
    parsed.rawText = text

    if (!parsed.items) parsed.items = []
    if (!parsed.flags) parsed.flags = {}

    parsed.items = parsed.items.map((item) => ({
      ...item,
      flags: item.flags || {},
    }))

    return parsed
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return {
      invoiceNo: null,
      poNumber: null,
      invoiceDate: null,
      supplierName: null,
      baseAmount: null,
      gstAmount: null,
      cgst: null,
      sgst: null,
      igst: null,
      otherTax: null,
      totalAmount: null,
      items: [],
      flags: {},
      error: `AI extraction failed: ${message}`,
    }
  }
}
