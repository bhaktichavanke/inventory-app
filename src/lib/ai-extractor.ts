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
      error: 'GEMINI_API_KEY not configured. Please add your API key in Settings or Environment Variables, or set GOOGLE_SERVICE_ACCOUNT_JSON with a service account JSON.',
    }
  }

  try {
    const genAI = new GoogleGenerativeAI(key)
    
    // Model fallback sequence to ensure compatibility across API versions
    const modelNames = [
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro',
    ]

    let imageBuffer: Buffer
    if (Buffer.isBuffer(imageInput)) {
      imageBuffer = imageInput
    } else {
      imageBuffer = await fs.readFile(imageInput)
    }

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

    // If Gemini didn't return text, try OpenAI fallback when configured
    if (!text) {
      const openAiKey = process.env.OPENAI_API_KEY
      if (openAiKey) {
        try {
          // dynamic import so bundler doesn't include the client in non-server builds
          const OpenAI = (await import('openai')).default
          const openai = new OpenAI({ apiKey: openAiKey })
          // avoid sending excessively large base64; truncate if necessary
          const maxLen = 200_000
          const sampleBase64 = base64Image.length > maxLen ? base64Image.slice(0, maxLen) : base64Image
          const userContent = `${EXTRACTION_PROMPT}\n\n===IMAGE_BASE64_START===\n${sampleBase64}\n===IMAGE_BASE64_END===${base64Image.length > maxLen ? '\nNOTE: base64 truncated' : ''}`

          const resp = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert invoice data extractor.' },
              { role: 'user', content: userContent },
            ],
            temperature: 0,
          })

          // Pull the returned text
          // @ts-ignore
          const maybe = resp?.choices?.[0]?.message?.content
          if (maybe) text = maybe
        } catch (oe) {
          const openErr = oe instanceof Error ? oe : new Error(String(oe))
          console.warn('OpenAI fallback failed:', openErr.message)
        }
      }

      if (!text && lastError) {
        throw lastError
      }
      if (!text) {
        throw new Error('No AI response produced')
      }
    }

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
