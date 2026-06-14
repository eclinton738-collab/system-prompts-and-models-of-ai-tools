'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Navigation } from '@/components/Navigation'
import { ClipLibrary } from '@/components/ClipLibrary'
import { PreviewPlayer } from '@/components/PreviewPlayer'
import { AIEngine } from '@/components/AIEngine'
import { Timeline } from '@/components/Timeline'
import {
  ClipMetadata, ProjectData, TimelineTrackData, TimelineClipData, DocumentaryStyle
} from '@/lib/types'

export default function EditorPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string

  const [project, setProject] = useState<ProjectData | null>(null)
  const [clips, setClips] = useState<ClipMetadata[]>([])
  const [timeline, setTimeline] = useState<TimelineTrackData[]>([])
  const [selectedClip, setSelectedClip] = useState<ClipMetadata | null>(null)
  const [playheadTime, setPlayheadTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'mp4' | 'mov'>('mp4')
  const [exportRes, setExportRes] = useState<'4K' | '1080p' | '720p'>('1080p')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) { router.push('/dashboard'); return }
      const data: ProjectData = await res.json()
      setProject(data)
      setClips(data.clips || [])
      setTimeline(data.timeline || [])
    } catch {
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [projectId, router])

  useEffect(() => {
    if (status === 'authenticated') loadProject()
  }, [status, loadProject])

  // Poll for clip processing status
  useEffect(() => {
    const processingClips = clips.filter(c => c.uploadStatus === 'PROCESSING')
    if (processingClips.length === 0) return

    const interval = setInterval(async () => {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) return
      const data: ProjectData = await res.json()
      const updatedClips = data.clips || []

      setClips(prev => prev.map(c => {
        const updated = updatedClips.find(u => u.id === c.id)
        return updated ? { ...updated, thumbnailUrl: updated.thumbnailUrl, streamUrl: updated.streamUrl } : c
      }))

      const stillProcessing = updatedClips.some(c => c.uploadStatus === 'PROCESSING')
      if (!stillProcessing) clearInterval(interval)
    }, 3000)

    return () => clearInterval(interval)
  }, [clips, projectId])

  const handleClipAdded = useCallback((clip: ClipMetadata) => {
    setClips(prev => [...prev, clip])
  }, [])

  const handleClipUpdated = useCallback((updated: ClipMetadata) => {
    setClips(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
  }, [])

  const handleClipSelect = useCallback((clip: ClipMetadata) => {
    setSelectedClip(clip)
  }, [])

  const handleAddToTimeline = useCallback(async (clip: ClipMetadata) => {
    const videoTrack = timeline.find(t => t.type === 'VIDEO')
    if (!videoTrack) return

    const lastClip = videoTrack.clips.reduce<TimelineClipData | null>((acc, c) => {
      if (!acc || c.startTime + c.duration > acc.startTime + acc.duration) return c
      return acc
    }, null)

    const startTime = lastClip ? lastClip.startTime + lastClip.duration : 0

    const res = await fetch(`/api/projects/${projectId}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackId: videoTrack.id,
        clipId: clip.id,
        startTime,
        duration: clip.duration,
        trimIn: 0,
        trimOut: 0,
        position: videoTrack.clips.length,
      }),
    })

    if (res.ok) {
      const newClip: TimelineClipData = await res.json()
      setTimeline(prev => prev.map(track =>
        track.id === videoTrack.id
          ? { ...track, clips: [...track.clips, { ...newClip, clip }] }
          : track
      ))
    }
  }, [timeline, projectId])

  const handleClipAdd = useCallback(async (trackId: string, clip: ClipMetadata, startTime: number) => {
    const res = await fetch(`/api/projects/${projectId}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackId, clipId: clip.id, startTime, duration: clip.duration, trimIn: 0, trimOut: 0,
        position: 0,
      }),
    })
    if (res.ok) {
      const newClip: TimelineClipData = await res.json()
      setTimeline(prev => prev.map(t =>
        t.id === trackId ? { ...t, clips: [...t.clips, { ...newClip, clip }] } : t
      ))
    }
  }, [projectId])

  const handleClipMove = useCallback(async (timelineClipId: string, trackId: string, startTime: number) => {
    await fetch(`/api/projects/${projectId}/timeline/${timelineClipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startTime }),
    })
    setTimeline(prev => prev.map(track => ({
      ...track,
      clips: track.clips.map(c => c.id === timelineClipId ? { ...c, startTime } : c),
    })))
  }, [projectId])

  const handleClipTrim = useCallback(async (timelineClipId: string, trimIn: number, trimOut: number) => {
    await fetch(`/api/projects/${projectId}/timeline/${timelineClipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trimIn, trimOut }),
    })
    setTimeline(prev => prev.map(track => ({
      ...track,
      clips: track.clips.map(c => c.id === timelineClipId ? { ...c, trimIn, trimOut } : c),
    })))
  }, [projectId])

  const handleClipRemove = useCallback(async (timelineClipId: string) => {
    await fetch(`/api/projects/${projectId}/timeline/${timelineClipId}`, { method: 'DELETE' })
    setTimeline(prev => prev.map(track => ({
      ...track,
      clips: track.clips.filter(c => c.id !== timelineClipId),
    })))
  }, [projectId])

  const handleStyleChange = useCallback(async (style: DocumentaryStyle) => {
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style }),
    })
    setProject(prev => prev ? { ...prev, style } : null)
  }, [projectId])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, format: exportFormat, resolution: exportRes }),
      })
      const data = await res.json()
      setShowExportModal(false)
      router.push('/exports')
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }, [projectId, exportFormat, exportRes, router])

  const userId = (session?.user as { id?: string })?.id || ''

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-forge-bg flex items-center justify-center">
        <div className="text-center">
          <div className="font-bebas text-4xl text-forge-red tracking-widest animate-pulse mb-4">
            LOADING FORGE
          </div>
          <div className="h-0.5 w-32 bg-forge-red mx-auto animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-forge-bg overflow-hidden">
      {/* Navigation */}
      <div className="flex-shrink-0">
        <div className="h-12 bg-forge-panel border-b border-forge-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="font-bebas text-lg tracking-widest text-forge-text hover:text-forge-red transition-colors">
              ACL <span className="text-forge-red">FORGE</span>
            </a>
            <span className="text-forge-border">›</span>
            <span className="font-bebas text-sm tracking-widest text-forge-muted truncate max-w-48">
              {project?.name || '...'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a href="/dashboard" className="font-mono text-xs text-forge-muted hover:text-forge-text transition-colors">
              ← Dashboard
            </a>
            <button
              onClick={() => setShowExportModal(true)}
              className="btn-forge px-4 py-2 font-bebas tracking-widest text-sm"
            >
              ⬆ EXPORT
            </button>
          </div>
        </div>
      </div>

      {/* Main editor grid */}
      <div className="flex-1 overflow-hidden" style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr 300px',
        gridTemplateRows: '1fr 220px',
      }}>
        {/* Left: Clip Library (spans 2 rows) */}
        <div style={{ gridRow: '1 / 3' }}>
          <ClipLibrary
            projectId={projectId}
            userId={userId}
            clips={clips}
            onClipAdded={handleClipAdded}
            onClipUpdated={handleClipUpdated}
            onClipSelect={handleClipSelect}
            onAddToTimeline={handleAddToTimeline}
          />
        </div>

        {/* Center: Preview Player */}
        <div style={{ gridColumn: '2', gridRow: '1' }}>
          <PreviewPlayer
            clip={selectedClip}
            streamUrl={selectedClip?.streamUrl || null}
            onTimeUpdate={setPlayheadTime}
            playheadTime={playheadTime}
          />
        </div>

        {/* Right: AI Engine (spans 2 rows) */}
        <div style={{ gridRow: '1 / 3' }}>
          <AIEngine
            projectId={projectId}
            clips={clips}
            style={(project?.style as DocumentaryStyle) || 'war-film'}
            timeline={timeline}
            onStyleChange={handleStyleChange}
          />
        </div>

        {/* Bottom: Timeline */}
        <div style={{ gridColumn: '2', gridRow: '2' }}>
          <Timeline
            tracks={timeline}
            clips={clips}
            projectId={projectId}
            playheadTime={playheadTime}
            onPlayheadChange={setPlayheadTime}
            onClipAdd={handleClipAdd}
            onClipMove={handleClipMove}
            onClipTrim={handleClipTrim}
            onClipRemove={handleClipRemove}
          />
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="forge-modal w-full max-w-md p-8">
            <h2 className="font-bebas text-3xl tracking-widest mb-6 text-forge-text">
              EXPORT <span className="text-forge-gold">PROJECT</span>
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block font-mono text-xs text-forge-muted uppercase tracking-widest mb-2">
                  Format
                </label>
                <div className="flex gap-3">
                  {(['mp4', 'mov'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setExportFormat(f)}
                      className={`flex-1 py-2 border font-bebas tracking-widest text-sm rounded transition-all ${
                        exportFormat === f
                          ? 'border-forge-gold bg-forge-gold/10 text-forge-gold'
                          : 'border-forge-border text-forge-muted hover:border-forge-gold/50'
                      }`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs text-forge-muted uppercase tracking-widest mb-2">
                  Resolution
                </label>
                <div className="flex gap-3">
                  {(['4K', '1080p', '720p'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setExportRes(r)}
                      className={`flex-1 py-2 border font-bebas tracking-widest text-sm rounded transition-all ${
                        exportRes === r
                          ? 'border-forge-gold bg-forge-gold/10 text-forge-gold'
                          : 'border-forge-border text-forge-muted hover:border-forge-gold/50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-3 border border-forge-border text-forge-muted font-bebas tracking-widest hover:border-forge-red hover:text-forge-red transition-all rounded"
              >
                CANCEL
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex-1 btn-forge-gold btn-forge py-3 font-bebas text-lg tracking-widest disabled:opacity-50"
              >
                {exporting ? 'QUEUING...' : 'START EXPORT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
