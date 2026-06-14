'use client'

import { useCallback, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import * as tus from 'tus-js-client'
import { ClipMetadata, UploadStatus } from '@/lib/types'

const CHUNK_SIZE = 50 * 1024 * 1024 // 50MB

interface Props {
  projectId: string
  userId: string
  clips: ClipMetadata[]
  onClipAdded: (clip: ClipMetadata) => void
  onClipUpdated: (clip: ClipMetadata) => void
  onClipSelect: (clip: ClipMetadata) => void
  onAddToTimeline: (clip: ClipMetadata) => void
}

interface UploadItem {
  file: File
  clipId?: string
  progress: number
  status: UploadStatus
  error?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function ProgressRing({ progress, size = 32 }: { progress: number; size?: number }) {
  const radius = (size - 4) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (progress / 100) * circ

  return (
    <svg width={size} height={size} className="absolute inset-0 m-auto">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#2A2A2A" strokeWidth="2" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#C8321E" strokeWidth="2"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="progress-ring-circle"
      />
    </svg>
  )
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'status-pending',
  UPLOADING: 'status-uploading',
  PROCESSING: 'status-processing',
  READY: 'status-ready',
  FAILED: 'status-failed',
}

export function ClipLibrary({
  projectId, userId, clips, onClipAdded, onClipUpdated, onClipSelect, onAddToTimeline
}: Props) {
  const [uploads, setUploads] = useState<Map<string, UploadItem>>(new Map())
  const uploadRefs = useRef<Map<string, tus.Upload>>(new Map())

  const startUpload = useCallback(async (file: File) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`
    setUploads(prev => new Map(prev).set(tempId, {
      file, progress: 0, status: 'PENDING'
    }))

    try {
      // Create clip record
      const metaRes = await fetch('/api/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          originalName: file.name,
          mimeType: file.type || 'video/mp4',
          size: file.size,
        }),
      })
      const { clip, uploadUrl } = await metaRes.json()

      setUploads(prev => {
        const next = new Map(prev)
        next.delete(tempId)
        next.set(clip.id, { file, clipId: clip.id, progress: 0, status: 'UPLOADING' })
        return next
      })

      onClipAdded({ ...clip, uploadProgress: 0 })

      // Use TUS for large files, direct PUT for small ones
      if (file.size > 10 * 1024 * 1024) {
        // TUS resumable upload
        const upload = new tus.Upload(file, {
          endpoint: `${window.location.origin}/api/tus`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          chunkSize: CHUNK_SIZE,
          metadata: {
            filename: file.name,
            filetype: file.type,
            projectId,
            clipId: clip.id,
          },
          onProgress(bytesUploaded, bytesTotal) {
            const progress = Math.round((bytesUploaded / bytesTotal) * 100)
            setUploads(prev => {
              const next = new Map(prev)
              const item = next.get(clip.id)
              if (item) next.set(clip.id, { ...item, progress, status: 'UPLOADING' })
              return next
            })
            onClipUpdated({ ...clip, uploadProgress: progress, uploadStatus: 'UPLOADING' })
          },
          async onSuccess() {
            setUploads(prev => {
              const next = new Map(prev)
              next.delete(clip.id)
              return next
            })
            await fetch('/api/upload', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clipId: clip.id }),
            })
            onClipUpdated({ ...clip, uploadStatus: 'PROCESSING', uploadProgress: 100 })
          },
          onError(error) {
            setUploads(prev => {
              const next = new Map(prev)
              const item = next.get(clip.id)
              if (item) next.set(clip.id, { ...item, status: 'FAILED', error: error.message })
              return next
            })
            onClipUpdated({ ...clip, uploadStatus: 'FAILED' })
          },
        })

        uploadRefs.current.set(clip.id, upload)
        upload.start()
      } else {
        // Direct PUT for small files
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        })

        setUploads(prev => { const next = new Map(prev); next.delete(clip.id); return next })
        await fetch('/api/upload', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clipId: clip.id }),
        })
        onClipUpdated({ ...clip, uploadStatus: 'PROCESSING', uploadProgress: 100 })
      }
    } catch (error) {
      setUploads(prev => {
        const next = new Map(prev)
        next.delete(tempId)
        return next
      })
    }
  }, [projectId, onClipAdded, onClipUpdated])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        startUpload(file)
      }
    })
  }, [startUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': [], 'audio/*': [] },
    noClick: false,
  })

  const activeUploads = Array.from(uploads.values())
  const allClips = [...clips]

  return (
    <div className="flex flex-col h-full bg-forge-panel border-r border-forge-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-forge-border flex items-center justify-between">
        <span className="font-bebas text-sm tracking-widest text-forge-muted">CLIP LIBRARY</span>
        <span className="timecode">{allClips.length} CLIPS</span>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`mx-3 mt-3 mb-2 border-2 border-dashed rounded p-4 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-forge-red bg-forge-red/10 text-forge-red'
            : 'border-forge-border text-forge-muted hover:border-forge-red/50 hover:text-forge-red/70'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-lg mb-1">{isDragActive ? '🔥' : '📁'}</div>
        <p className="font-mono text-xs">
          {isDragActive ? 'Drop to forge' : 'Drop video files or click'}
        </p>
        <p className="font-mono text-xs opacity-50 mt-0.5">4K, ProRes, H.264, H.265</p>
      </div>

      {/* Clips list */}
      <div className="flex-1 overflow-y-auto space-y-2 px-3 pb-3">
        {/* Active uploads */}
        {activeUploads.map((upload, i) => (
          <div key={i} className="bg-forge-track border border-forge-border rounded p-3 relative">
            <div className="flex items-start gap-3">
              <div className="w-14 h-10 bg-forge-bg rounded flex items-center justify-center relative flex-shrink-0">
                <ProgressRing progress={upload.progress} size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-forge-text truncate">{upload.file.name}</p>
                <p className="font-mono text-xs text-forge-muted">{formatBytes(upload.file.size)}</p>
                <div className="mt-1.5 h-0.5 bg-forge-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-forge-red transition-all"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
                <p className="font-mono text-xs text-forge-red mt-1">{upload.progress}% UPLOADING</p>
              </div>
            </div>
          </div>
        ))}

        {/* Existing clips */}
        {allClips.map((clip) => (
          <ClipCard
            key={clip.id}
            clip={clip}
            onSelect={() => onClipSelect(clip)}
            onAddToTimeline={() => onAddToTimeline(clip)}
          />
        ))}

        {allClips.length === 0 && activeUploads.length === 0 && (
          <div className="text-center py-8 text-forge-muted">
            <p className="font-mono text-xs">No clips yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ClipCard({
  clip,
  onSelect,
  onAddToTimeline,
}: {
  clip: ClipMetadata
  onSelect: () => void
  onAddToTimeline: () => void
}) {
  return (
    <div className="bg-forge-track border border-forge-border rounded overflow-hidden group hover:border-forge-red/50 transition-all">
      {/* Thumbnail */}
      <div
        className="relative h-14 bg-forge-bg cursor-pointer"
        onClick={onSelect}
      >
        {clip.thumbnailUrl ? (
          <img src={clip.thumbnailUrl} alt={clip.originalName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl opacity-20">▶</span>
          </div>
        )}
        {clip.uploadStatus === 'PROCESSING' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-forge-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <span className="absolute bottom-1 right-1 timecode bg-black/70 px-1">
          {formatDuration(clip.duration)}
        </span>
      </div>

      {/* Info */}
      <div className="px-2 py-1.5">
        <p className="font-mono text-xs text-forge-text truncate">{clip.originalName}</p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="font-mono text-xs text-forge-muted">{formatBytes(Number(clip.size))}</span>
          <span className={`status-badge ${STATUS_CLASS[clip.uploadStatus]}`}>
            {clip.uploadStatus}
          </span>
        </div>
      </div>

      {/* Add to timeline button */}
      {clip.uploadStatus === 'READY' && (
        <button
          onClick={onAddToTimeline}
          className="w-full py-1 bg-forge-red/10 text-forge-red font-bebas text-xs tracking-widest hover:bg-forge-red/20 transition-colors opacity-0 group-hover:opacity-100"
        >
          + ADD TO TIMELINE
        </button>
      )}
    </div>
  )
}
