'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Package, Search, Download, Plus, AlertTriangle, Eye, Filter } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const [newProduct, setNewProduct] = useState({
    partNo: '',
    description: '',
    category: '',
    supplierName: '',
    unitPrice: 0,
    currentStock: 0,
    lowStockThreshold: 5,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, categoryFilter, statusFilter],
    queryFn: () =>
      fetch(`/api/products?search=${encodeURIComponent(search)}&category=${categoryFilter}&status=${statusFilter}`).then((r) =>
        r.json()
      ),
  })

  const createProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create product')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast({ title: 'Success', description: 'Product created successfully.', type: 'success' })
      setShowAddModal(false)
      setNewProduct({ partNo: '', description: '', category: '', supplierName: '', unitPrice: 0, currentStock: 0, lowStockThreshold: 5 })
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, type: 'error' })
    },
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Product Master</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Continuous catalog of all historical and newly added products.</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/api/excel?type=products"
            download
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export Master Excel
          </a>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Part No, Item Description, Category, Supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-900 font-medium"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none text-slate-700 font-medium"
          >
            <option value="">All Categories</option>
            <option value="Motors">Motors</option>
            <option value="Microcontrollers">Microcontrollers</option>
            <option value="Drivers">Drivers</option>
            <option value="Sensors">Sensors</option>
            <option value="Power">Power</option>
            <option value="Passive">Passive</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none text-slate-700 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISCONTINUED">Discontinued</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
              <th className="p-4">Part No.</th>
              <th className="p-4">Item Description</th>
              <th className="p-4">Category</th>
              <th className="p-4">Supplier</th>
              <th className="p-4">Current Stock</th>
              <th className="p-4">Total Purchased</th>
              <th className="p-4">Total Used</th>
              <th className="p-4">Unit Price</th>
              <th className="p-4">Last Purchase Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400">Loading product master...</td>
              </tr>
            ) : data?.products?.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400">No products found.</td>
              </tr>
            ) : (
              data?.products?.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-bold text-blue-600 font-mono">
                    <Link href={`/products/${p.id}`} className="hover:underline">
                      {p.partNo}
                    </Link>
                  </td>
                  <td className="p-4 font-semibold text-slate-900">{p.description}</td>
                  <td className="p-4">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                      {p.category || 'General'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">{p.supplier?.name || '—'}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className={p.isLowStock ? 'text-amber-600 font-extrabold' : 'text-slate-900'}>
                        {p.currentStock}
                      </span>
                      {p.isLowStock && (
                        <span title="Low stock warning!">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-slate-600">{p.totalPurchased}</td>
                  <td className="p-4 text-slate-600">{p.totalUsed}</td>
                  <td className="p-4 text-slate-800 font-semibold">{formatCurrency(p.unitPrice)}</td>
                  <td className="p-4 text-slate-500 text-xs">{formatDate(p.lastPurchaseDate)}</td>
                  <td className="p-4 text-right">
                    <Link href={`/products/${p.id}`} className="p-2 text-slate-400 hover:text-blue-600 inline-block transition-colors">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
            <h2 className="text-xl font-extrabold text-slate-900">Add New Product</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Part No. *</label>
                <input
                  type="text"
                  placeholder="e.g. MTR-002"
                  value={newProduct.partNo}
                  onChange={(e) => setNewProduct({ ...newProduct, partNo: e.target.value })}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Item Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Servo Motor Micro SG90"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="Motors"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    placeholder="Supplier Name"
                    value={newProduct.supplierName}
                    onChange={(e) => setNewProduct({ ...newProduct, supplierName: e.target.value })}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    value={newProduct.unitPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, unitPrice: Number(e.target.value) })}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={newProduct.currentStock}
                    onChange={(e) => setNewProduct({ ...newProduct, currentStock: Number(e.target.value) })}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Low Stock Limit</label>
                  <input
                    type="number"
                    value={newProduct.lowStockThreshold}
                    onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: Number(e.target.value) })}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={() => createProductMutation.mutate(newProduct)}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm"
              >
                Create Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
