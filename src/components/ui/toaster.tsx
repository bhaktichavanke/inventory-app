'use client'

import { useState, useEffect } from 'react'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  type?: 'success' | 'error' | 'info'
}

let toastListeners: ((toast: ToastMessage) => void)[] = []

export function toast(opts: { title: string; description?: string; type?: 'success' | 'error' | 'info' }) {
  const t: ToastMessage = { id: Math.random().toString(), ...opts }
  toastListeners.forEach(fn => fn(t))
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const handler = (t: ToastMessage) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id))
      }, 4000)
    }
    toastListeners.push(handler)
    return () => {
      toastListeners = toastListeners.filter(fn => fn !== handler)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`p-4 rounded-xl shadow-lg border text-sm transition-all animate-in fade-in slide-in-from-bottom-2 ${
            t.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : t.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-gray-900 border-gray-800 text-white'
          }`}
        >
          <p className="font-semibold">{t.title}</p>
          {t.description && <p className="text-xs opacity-90 mt-1">{t.description}</p>}
        </div>
      ))}
    </div>
  )
}
