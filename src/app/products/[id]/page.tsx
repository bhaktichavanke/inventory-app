'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, History, FolderKanban, AlertTriangle, FileText, CheckCircle, Clock } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetch(`/api/products/${id}`).then((r) => r.json()),
  })

  if (isLoading) return <div className="p-8 text-gray-500">Loading product traceability data...</div>
  if (!product || product.error) return <div className="p-8 text-red-500">Product not found.</div>

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back to Product Master
        </button>
      </div>

      {/* Main Overview Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{product.partNo}</h1>
            <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-semibold">
              {product.category || 'General'}
            </span>
            {product.isLowStock && (
              <span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
              </span>
            )}
          </div>
          <p className="text-base font-medium text-gray-700 mt-1">{product.description}</p>
          <p className="text-sm text-gray-400 mt-1">
            Supplier: <span className="text-gray-800 font-medium">{product.supplier?.name || '—'}</span> · Unit Price:{' '}
            <span className="text-gray-800 font-medium">{formatCurrency(product.unitPrice)}</span>
          </p>
        </div>

        {/* Real-time Formula Card */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center min-w-64">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Stock Formula Breakdown</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Total Purchased: <span className="font-bold text-gray-900">{product.totalPurchased}</span></p>
            <p>− Total Used in Projects: <span className="font-bold text-red-600">{product.totalUsed}</span></p>
            <div className="border-t pt-1 font-bold text-base text-gray-900">
              = Current Stock: <span className={product.isLowStock ? 'text-red-600 font-black' : 'text-green-600'}>{product.currentStock}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Traceability Section 1: Purchase History (Invoices & POs) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-gray-50/50 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-semibold text-gray-900">Purchase History & Source Invoices</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs border-b">
              <th className="p-4">Invoice No</th>
              <th className="p-4">PO Number</th>
              <th className="p-4">Supplier</th>
              <th className="p-4">Qty Purchased</th>
              <th className="p-4">Unit Cost</th>
              <th className="p-4">Purchase Date</th>
              <th className="p-4">Invoice Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {product.purchaseHistory?.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">No purchase records linked yet.</td>
              </tr>
            ) : (
              product.purchaseHistory?.map((ph: any) => (
                <tr key={ph.id} className="hover:bg-gray-50/60">
                  <td className="p-4 font-semibold text-blue-600">
                    <Link href={`/invoices/${ph.invoiceId}`} className="hover:underline">
                      {ph.invoice?.invoiceNo}
                    </Link>
                  </td>
                  <td className="p-4 text-gray-600">{ph.invoice?.poNumber || '—'}</td>
                  <td className="p-4 text-gray-800">{ph.invoice?.supplier?.name || '—'}</td>
                  <td className="p-4 font-bold text-gray-900">{ph.quantity}</td>
                  <td className="p-4 text-gray-700">{formatCurrency(ph.unitPrice)}</td>
                  <td className="p-4 text-gray-600">{formatDate(ph.date)}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      ph.invoice?.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {ph.invoice?.status === 'RECEIVED' ? 'Received' : 'Not Received'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Traceability Section 2: Project Usage History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-gray-50/50 flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-purple-600" />
          <h2 className="text-base font-semibold text-gray-900">Project Component Usage</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs border-b">
              <th className="p-4">Project Name</th>
              <th className="p-4">Qty Used</th>
              <th className="p-4">Sourced Invoice</th>
              <th className="p-4">Date Used</th>
              <th className="p-4">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {product.projectComponents?.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">No project component usage records yet.</td>
              </tr>
            ) : (
              product.projectComponents?.map((pc: any) => (
                <tr key={pc.id} className="hover:bg-gray-50/60">
                  <td className="p-4 font-semibold text-purple-700">
                    <Link href={`/projects/${pc.projectId}`} className="hover:underline">
                      {pc.project?.name}
                    </Link>
                  </td>
                  <td className="p-4 font-bold text-gray-900">{pc.quantityUsed}</td>
                  <td className="p-4 text-blue-600">
                    {pc.invoice ? (
                      <Link href={`/invoices/${pc.invoiceId}`} className="hover:underline">
                        {pc.invoice.invoiceNo}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-4 text-gray-600">{formatDate(pc.dateUsed)}</td>
                  <td className="p-4 text-gray-500 text-xs">{pc.notes || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
