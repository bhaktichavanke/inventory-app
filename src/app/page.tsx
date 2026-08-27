'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { 
  Package, FileText, Boxes, FolderKanban, 
  AlertTriangle, CheckCircle, Clock, Upload, Plus, TrendingDown,
  ArrowRight, ShieldCheck, Layers, Sparkles
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface DashboardData {
  totalProducts: number
  totalInventoryItems: number
  lowStockProducts: number
  totalInvoices: number
  receivedInvoices: number
  notReceivedInvoices: number
  activeProjects: number
  recentProducts: Array<{ id: string; partNo: string; description: string; currentStock: number; supplier: { name: string } | null; createdAt: string }>
  recentInvoices: Array<{ id: string; invoiceNo: string; totalAmount: number; status: string; supplier: { name: string } | null; createdAt: string }>
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
  })

  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <div className="p-8 text-red-600 font-medium">Failed to load dashboard data.</div>

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Hero Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
            <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-blue-100 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Real-Time Overview
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Monitor inventory levels, invoice processing, stock alerts, and project components.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/invoices/upload"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all"
          >
            <Upload className="w-4 h-4" /> Upload Invoice
          </Link>
          <Link
            href="/products?action=add"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-slate-500" /> Add Product
          </Link>
          <Link
            href="/projects?action=add"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
          >
            <FolderKanban className="w-4 h-4 text-slate-500" /> Add Project
          </Link>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Products"
          value={data.totalProducts}
          subtitle="Registered in catalog"
          icon={<Package className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
          borderColor="border-blue-100"
          href="/products"
        />
        <StatCard
          title="Total Inventory Items"
          value={data.totalInventoryItems.toFixed(0)}
          subtitle="Physical units in stock"
          icon={<Boxes className="w-5 h-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
          borderColor="border-indigo-100"
          href="/inventory"
        />
        <StatCard
          title="Low Stock Warning"
          value={data.lowStockProducts}
          subtitle={data.lowStockProducts > 0 ? "Requires reordering" : "All stock healthy"}
          icon={<TrendingDown className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-50"
          borderColor={data.lowStockProducts > 0 ? "border-amber-200 bg-amber-50/20" : "border-slate-200"}
          href="/inventory?filter=lowStock"
          alert={data.lowStockProducts > 0}
        />
        <StatCard
          title="Active Projects"
          value={data.activeProjects}
          subtitle="Using components"
          icon={<FolderKanban className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-50"
          borderColor="border-purple-100"
          href="/projects"
        />
      </div>

      {/* Invoice Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoices</span>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-3xl font-extrabold text-slate-900">{data.totalInvoices}</p>
          </div>
          <Link href="/invoices" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-4">
            View all invoices <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200/80 p-6 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-all bg-emerald-50/10">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Received Invoices</span>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-emerald-700">{data.receivedInvoices}</p>
          </div>
          <Link href="/invoices?status=RECEIVED" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-4">
            View received <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200/80 p-6 shadow-sm flex flex-col justify-between hover:border-amber-300 transition-all bg-amber-50/10">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending Invoices</span>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-amber-700">{data.notReceivedInvoices}</p>
          </div>
          <Link href="/invoices?status=NOT_RECEIVED" className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 mt-4">
            View pending <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Added Products */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-slate-900 text-sm">Recently Added Products</h2>
            </div>
            <Link href="/products" className="text-xs font-semibold text-blue-600 hover:underline">
              View Product Master →
            </Link>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {data.recentProducts.length === 0 ? (
              <p className="text-sm text-slate-400 p-6 text-center">No products added yet.</p>
            ) : (
              data.recentProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {p.description}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      <span className="font-mono text-slate-500 font-semibold">{p.partNo}</span> · {p.supplier?.name || 'No supplier'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${p.currentStock <= 5 ? 'text-amber-600' : 'text-slate-900'}`}>
                      {p.currentStock} units
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(p.createdAt)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recently Uploaded Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-slate-900 text-sm">Recently Uploaded Invoices</h2>
            </div>
            <Link href="/invoices" className="text-xs font-semibold text-blue-600 hover:underline">
              View Invoices →
            </Link>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {data.recentInvoices.length === 0 ? (
              <p className="text-sm text-slate-400 p-6 text-center">No invoices uploaded yet.</p>
            ) : (
              data.recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 font-mono group-hover:text-blue-600 transition-colors">
                      {inv.invoiceNo}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{inv.supplier?.name || 'Unknown supplier'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(inv.totalAmount)}</p>
                    <span
                      className={`inline-block text-[11px] px-2 py-0.5 rounded-md font-semibold mt-0.5 ${
                        inv.status === 'RECEIVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      }`}
                    >
                      {inv.status === 'RECEIVED' ? 'Received' : 'Pending'}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="pt-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Navigation</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { href: '/invoices/upload', label: 'Upload Invoice', icon: Upload, color: 'bg-blue-50/80 hover:bg-blue-100 text-blue-700 border-blue-200/70' },
            { href: '/products?action=add', label: 'Add Product', icon: Package, color: 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border-indigo-200/70' },
            { href: '/projects?action=add', label: 'Add Project', icon: FolderKanban, color: 'bg-purple-50/80 hover:bg-purple-100 text-purple-700 border-purple-200/70' },
            { href: '/inventory', label: 'View Inventory', icon: Boxes, color: 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 border-emerald-200/70' },
            { href: '/invoices', label: 'View Invoices', icon: FileText, color: 'bg-amber-50/80 hover:bg-amber-100 text-amber-100 text-amber-800 border-amber-200/70' },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm ${color}`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon, iconBg, borderColor, href, alert }: {
  title: string; value: number | string; subtitle: string; icon: React.ReactNode;
  iconBg: string; borderColor: string; href: string; alert?: boolean
}) {
  return (
    <Link
      href={href}
      className={`bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between ${borderColor}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>{icon}</div>
        {alert && <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />}
      </div>
      <div>
        <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
        <p className="text-xs font-bold text-slate-700 mt-1">{title}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
      </div>
    </Link>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="h-24 bg-white border border-slate-200 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 bg-white border border-slate-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
