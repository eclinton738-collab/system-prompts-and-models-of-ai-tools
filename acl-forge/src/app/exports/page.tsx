'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Navigation } from '@/components/Navigation'
import { ExportData } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'status-pending',
  PROCESSING: 'status-processing',
  COMPLETED: 'status-ready',
  FAILED: 'status-failed',
}

export default function ExportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [exports, setExports] = useState<(ExportData & { project?: { name: string }, downloadUrl?: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/export')
        .then(r => r.json())
        .then(data => { setExports(data); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [status])

  async function checkStatus(exportRecord: ExportData & { project?: { name: string } }) {
    const res = await fetch(`/api/export/${exportRecord.id}/status`)
    const data = await res.json()
    setExports(prev => prev.map(e => e.id === exportRecord.id ? { ...e, ...data } : e))
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-forge-bg">
        <Navigation />
        <div className="p-8 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 skeleton rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-forge-bg">
      <Navigation />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-bebas text-4xl tracking-widest text-forge-text">
            EXPORT <span className="text-forge-gold">HISTORY</span>
          </h1>
          <p className="text-forge-muted font-mono text-sm mt-1">
            {exports.length} export{exports.length !== 1 ? 's' : ''}
          </p>
        </div>

        {exports.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4 opacity-20">📤</div>
            <h2 className="font-bebas text-2xl text-forge-muted tracking-widest">
              NO EXPORTS YET
            </h2>
            <p className="text-forge-muted font-mono text-sm mt-2">
              Export a project from the editor to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {exports.map((exp) => (
              <div key={exp.id} className="bg-forge-panel border border-forge-border rounded p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bebas text-xl tracking-wide text-forge-text">
                      {exp.project?.name || exp.projectId}
                    </h3>
                    <span className={`status-badge ${STATUS_COLORS[exp.status]}`}>
                      {exp.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-forge-muted font-mono text-xs">
                    <span>{exp.format.toUpperCase()}</span>
                    <span>•</span>
                    <span>{exp.resolution}</span>
                    <span>•</span>
                    <span>{new Date(exp.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {exp.status === 'PROCESSING' && (
                    <button
                      onClick={() => checkStatus(exp)}
                      className="text-forge-gold font-mono text-xs hover:text-forge-gold-light transition-colors"
                    >
                      Refresh Status
                    </button>
                  )}
                  {exp.status === 'COMPLETED' && exp.downloadUrl && (
                    <a
                      href={exp.downloadUrl}
                      download
                      className="btn-forge-gold btn-forge px-4 py-2 font-bebas tracking-widest text-sm"
                    >
                      DOWNLOAD
                    </a>
                  )}
                  {exp.status === 'FAILED' && (
                    <span className="text-forge-red font-mono text-xs">Export failed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
