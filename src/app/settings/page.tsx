'use client'

import { useState, useEffect } from 'react'
import { Settings, Key, AlertTriangle, Save, CheckCircle2 } from 'lucide-react'
import { toast } from '@/components/ui/toaster'

export default function SettingsPage() {
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [apiKeySet, setApiKeySet] = useState(false)
  const [lowStockThreshold, setLowStockThreshold] = useState(5)
  const [currency, setCurrency] = useState('INR')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setApiKeySet(!!data.geminiApiKeySet)
          if (data.lowStockThreshold) setLowStockThreshold(data.lowStockThreshold)
          if (data.currency) setCurrency(data.currency)
        }
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geminiApiKey: geminiApiKey ? geminiApiKey : undefined,
          lowStockThreshold,
          currency,
        }),
      })

      if (!res.ok) throw new Error('Failed to save settings')

      toast({ title: 'Settings Saved', description: 'Your preferences have been updated.', type: 'success' })
      setApiKeySet(!!geminiApiKey || apiKeySet)
      setGeminiApiKey('')
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save settings.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Application Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure AI OCR API keys and global inventory rules.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6 shadow-sm">
        {/* Gemini API Key */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Key className="w-4 h-4 text-blue-600" /> Gemini API Key
          </label>
          <p className="text-xs text-gray-500">
            Required for AI/OCR invoice extraction. Get your key at{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-blue-600 underline">
              aistudio.google.com
            </a>.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="password"
              placeholder={apiKeySet ? '•••••••••••••••••••••••• (API Key Configured)' : 'Enter your Gemini API Key'}
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="flex-1 p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {apiKeySet && (
              <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <CheckCircle2 className="w-4 h-4" /> Key Set
              </span>
            )}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Global Inventory Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Default Low-Stock Warning Threshold
            </label>
            <input
              type="number"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(Number(e.target.value))}
              className="w-full p-2.5 text-sm border border-gray-300 rounded-lg"
            />
            <p className="text-[11px] text-gray-400 mt-1">Products with stock at or below this number will trigger low-stock alerts.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full p-2.5 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="INR">Indian Rupee (₹)</option>
              <option value="USD font-sans">US Dollar ($)</option>
              <option value="EUR">Euro (€)</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}