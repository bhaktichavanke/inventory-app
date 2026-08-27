'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { FolderKanban, Plus, Download, ChevronRight, Calendar, Boxes } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'

export default function ProjectsPage() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', description: '', status: 'ACTIVE' })

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then((r) => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create project')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast({ title: 'Project Created', description: `Project "${data.name}" ready to assign components!`, type: 'success' })
      setShowAddModal(false)
      setNewProject({ name: '', description: '', status: 'ACTIVE' })
    },
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
          <p className="text-sm text-gray-500 mt-1">Assign inventory components to projects and automatically deduct available stock.</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/api/excel?type=project_components"
            download
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Export Components Excel
          </a>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Project
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full p-8 text-center text-gray-400">Loading projects...</div>
        ) : data?.projects?.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-400 bg-white rounded-xl border">
            No projects yet. Click "Create Project" to get started.
          </div>
        ) : (
          data?.projects?.map((proj: any) => (
            <Link
              key={proj.id}
              href={`/projects/${proj.id}`}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all flex flex-col justify-between group space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-full font-semibold">
                    {proj.status}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {proj.name}
                </h2>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{proj.description || 'No description provided.'}</p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1 font-medium text-gray-700">
                  <Boxes className="w-4 h-4 text-purple-600" /> {proj.components?.length || 0} Components
                </span>
                <span>Created {formatDate(proj.createdAt)}</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Create Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Create New Project</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Autonomous Robot"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Project goal or component requirements..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg h-20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={newProject.status}
                  onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg bg-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(newProject)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
