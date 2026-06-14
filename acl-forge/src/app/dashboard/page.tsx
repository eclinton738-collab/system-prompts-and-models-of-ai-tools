'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Navigation } from '@/components/Navigation'
import { ProjectData } from '@/lib/types'

const STYLE_LABELS: Record<string, string> = {
  'war-film': 'War Film',
  'hype-reel': 'Hype Reel',
  'legacy-epic': 'Legacy Epic',
  'raw-gritty': 'Raw / Gritty',
}

const STYLE_COLORS: Record<string, string> = {
  'war-film': 'text-forge-red',
  'hype-reel': 'text-forge-gold',
  'legacy-epic': 'text-blue-400',
  'raw-gritty': 'text-forge-muted',
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewProject, setShowNewProject] = useState(false)
  const [newName, setNewName] = useState('')
  const [newStyle, setNewStyle] = useState('war-film')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/projects')
        .then(r => r.json())
        .then(data => { setProjects(data); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [status])

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), style: newStyle }),
      })
      const project = await res.json()
      router.push(`/editor/${project.id}`)
    } catch {
      setCreating(false)
    }
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this project? This cannot be undone.')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-forge-bg">
        <Navigation />
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 skeleton rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-forge-bg">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-bebas text-4xl tracking-widest text-forge-text">
              YOUR <span className="text-forge-red">PROJECTS</span>
            </h1>
            <p className="text-forge-muted font-mono text-sm mt-1">
              {projects.length} documentary{projects.length !== 1 ? 's' : ''} in the forge
            </p>
          </div>

          <button
            onClick={() => setShowNewProject(true)}
            className="btn-forge px-6 py-3 font-bebas text-lg tracking-widest"
          >
            + NEW PROJECT
          </button>
        </div>

        {/* Projects grid */}
        {projects.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-6 opacity-20">⬛</div>
            <h2 className="font-bebas text-3xl text-forge-muted tracking-widest mb-3">
              NO PROJECTS YET
            </h2>
            <p className="text-forge-muted font-mono text-sm mb-8">
              Create your first ACL documentary
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="btn-forge px-8 py-4 font-bebas text-xl tracking-widest"
            >
              START FORGING
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-forge-panel border border-forge-border rounded group hover:border-forge-red transition-all cursor-pointer relative overflow-hidden"
              >
                {/* Thumbnail placeholder */}
                <div
                  className="h-32 bg-forge-track flex items-center justify-center border-b border-forge-border"
                  onClick={() => router.push(`/editor/${project.id}`)}
                >
                  <span className="font-bebas text-5xl text-forge-border group-hover:text-forge-red transition-colors">
                    ▶
                  </span>
                </div>

                {/* Info */}
                <div className="p-4" onClick={() => router.push(`/editor/${project.id}`)}>
                  <h3 className="font-bebas text-xl tracking-wide text-forge-text mb-1 line-clamp-1">
                    {project.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono ${STYLE_COLORS[project.style] || 'text-forge-muted'}`}>
                      {STYLE_LABELS[project.style] || project.style}
                    </span>
                    <span className="text-forge-muted text-xs font-mono">
                      {(project._count?.clips || 0)} clips
                    </span>
                  </div>
                  <p className="text-forge-muted text-xs font-mono mt-2">
                    {new Date(project.updatedAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteProject(project.id) }}
                    className="p-1.5 bg-forge-bg border border-forge-border rounded text-forge-muted hover:text-forge-red hover:border-forge-red transition-all text-xs"
                    title="Delete project"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {/* New project card */}
            <button
              onClick={() => setShowNewProject(true)}
              className="h-48 border-2 border-dashed border-forge-border rounded flex flex-col items-center justify-center gap-3 hover:border-forge-red hover:text-forge-red text-forge-muted transition-all group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">+</span>
              <span className="font-bebas text-lg tracking-widest">NEW PROJECT</span>
            </button>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="forge-modal w-full max-w-md p-8">
            <h2 className="font-bebas text-3xl tracking-widest mb-6 text-forge-text">
              NEW <span className="text-forge-red">PROJECT</span>
            </h2>

            <form onSubmit={createProject} className="space-y-6">
              <div>
                <label className="block font-mono text-xs text-forge-muted mb-2 uppercase tracking-widest">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="ACL Championship 2024..."
                  className="forge-input w-full px-4 py-3 text-forge-text placeholder-forge-border"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-forge-muted mb-3 uppercase tracking-widest">
                  Documentary Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'war-film', label: 'War Film', icon: '⚔' },
                    { value: 'hype-reel', label: 'Hype Reel', icon: '⚡' },
                    { value: 'legacy-epic', label: 'Legacy Epic', icon: '👑' },
                    { value: 'raw-gritty', label: 'Raw / Gritty', icon: '🎥' },
                  ].map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setNewStyle(s.value)}
                      className={`style-card p-3 text-center ${newStyle === s.value ? 'active' : ''}`}
                    >
                      <div className="text-xl mb-1">{s.icon}</div>
                      <div className="font-mono text-xs text-forge-text">{s.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowNewProject(false); setNewName('') }}
                  className="flex-1 py-3 border border-forge-border text-forge-muted font-bebas tracking-widest hover:border-forge-red hover:text-forge-red transition-all rounded"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="flex-1 btn-forge py-3 font-bebas text-lg tracking-widest disabled:opacity-50"
                >
                  {creating ? 'FORGING...' : 'CREATE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
