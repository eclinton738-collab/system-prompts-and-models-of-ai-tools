'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TimelineTrackData, TimelineClipData, ClipMetadata, TrackType } from '@/lib/types'

const TRACK_COLORS: Record<TrackType, string> = {
  VIDEO: '#C8321E',
  AUDIO: '#B8962E',
  VO: '#4A90D9',
  FX: '#9B59B6',
}

const TRACK_BG: Record<TrackType, string> = {
  VIDEO: 'track-video',
  AUDIO: 'track-audio',
  VO: 'track-vo',
  FX: 'track-fx',
}

const TRACK_HEIGHT = 48
const RULER_HEIGHT = 28
const LABEL_WIDTH = 80
const PX_PER_SECOND = 50

interface Props {
  tracks: TimelineTrackData[]
  clips: ClipMetadata[]
  projectId: string
  playheadTime: number
  onPlayheadChange: (time: number) => void
  onClipAdd: (trackId: string, clip: ClipMetadata, startTime: number) => Promise<void>
  onClipMove: (clipId: string, trackId: string, startTime: number) => Promise<void>
  onClipTrim: (clipId: string, trimIn: number, trimOut: number) => Promise<void>
  onClipRemove: (clipId: string) => Promise<void>
  onAITrim?: () => void
  onAIReorder?: () => void
}

type Tool = 'select' | 'razor' | 'slip' | 'zoom'

function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds % 1) * 24)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`
}

function RulerTick({ time, zoom }: { time: number; zoom: number }) {
  const left = time * PX_PER_SECOND * zoom + LABEL_WIDTH
  const isMajor = time % 5 === 0

  return (
    <div
      className={`ruler-tick ${isMajor ? 'major' : 'minor'} absolute`}
      style={{ left, bottom: 0 }}
    >
      {isMajor && (
        <span className="timecode absolute -top-4 text-xs" style={{ left: -14 }}>
          {formatTimecode(time)}
        </span>
      )}
    </div>
  )
}

export function Timeline({
  tracks, clips, projectId, playheadTime,
  onPlayheadChange, onClipAdd, onClipMove, onClipTrim, onClipRemove,
  onAITrim, onAIReorder,
}: Props) {
  const [tool, setTool] = useState<Tool>('select')
  const [zoom, setZoom] = useState(1)
  const [undoStack, setUndoStack] = useState<TimelineTrackData[][]>([])
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{
    clipId: string; trackId: string; startX: number; startTime: number
  } | null>(null)
  const [trimming, setTrimming] = useState<{
    clipId: string; side: 'left' | 'right'; startX: number; startTrim: number
  } | null>(null)

  const timelineRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)

  const totalDuration = Math.max(
    60,
    ...tracks.flatMap(t => t.clips.map(c => c.startTime + c.duration))
  )

  const timelineWidth = totalDuration * PX_PER_SECOND * zoom + LABEL_WIDTH + 200

  // Ruler ticks
  const tickInterval = zoom > 1.5 ? 1 : zoom > 0.5 ? 5 : 10
  const ticks = Array.from(
    { length: Math.ceil(totalDuration / tickInterval) + 1 },
    (_, i) => i * tickInterval
  )

  const handleRulerClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - LABEL_WIDTH + timelineRef.current.scrollLeft
    const time = Math.max(0, x / (PX_PER_SECOND * zoom))
    onPlayheadChange(time)
  }, [zoom, onPlayheadChange])

  const handleDragStart = useCallback((
    e: React.MouseEvent,
    clipId: string,
    trackId: string,
    startTime: number
  ) => {
    if (tool !== 'select') return
    e.preventDefault()
    setSelectedClipId(clipId)
    setDragging({ clipId, trackId, startX: e.clientX, startTime })
  }, [tool])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragging) {
      const dx = e.clientX - dragging.startX
      const dt = dx / (PX_PER_SECOND * zoom)
      const newTime = Math.max(0, dragging.startTime + dt)
      // Visual update handled by local state in clip; actual move on mouseup
    }
    if (trimming) {
      // Trim logic handled on mouseup
    }
  }, [dragging, trimming, zoom])

  const handleMouseUp = useCallback(async (e: MouseEvent) => {
    if (dragging) {
      const dx = e.clientX - dragging.startX
      const dt = dx / (PX_PER_SECOND * zoom)
      const newTime = Math.max(0, dragging.startTime + dt)
      await onClipMove(dragging.clipId, dragging.trackId, newTime)
      setDragging(null)
    }
    if (trimming) {
      setTrimming(null)
    }
  }, [dragging, trimming, zoom, onClipMove])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const handleDrop = useCallback(async (e: React.DragEvent, trackId: string) => {
    e.preventDefault()
    const clipId = e.dataTransfer.getData('clipId')
    const clip = clips.find(c => c.id === clipId)
    if (!clip) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = Math.max(0, (x - LABEL_WIDTH) / (PX_PER_SECOND * zoom))

    await onClipAdd(trackId, clip, time)
  }, [clips, zoom, onClipAdd])

  const tools: Array<{ id: Tool; icon: string; label: string }> = [
    { id: 'select', icon: '↖', label: 'Select' },
    { id: 'razor', icon: '✂', label: 'Razor' },
    { id: 'slip', icon: '↔', label: 'Slip' },
    { id: 'zoom', icon: '🔍', label: 'Zoom' },
  ]

  return (
    <div className="flex flex-col h-full bg-forge-bg border-t border-forge-border">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-forge-border bg-forge-panel flex-shrink-0">
        {/* Tool buttons */}
        <div className="flex items-center gap-1">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              className={`w-7 h-7 rounded text-xs flex items-center justify-center transition-colors ${
                tool === t.id
                  ? 'bg-forge-red text-white'
                  : 'text-forge-muted hover:text-forge-text hover:bg-forge-track'
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-forge-border" />

        {/* Zoom */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
            className="w-6 h-6 text-forge-muted hover:text-forge-text text-xs flex items-center justify-center"
          >
            −
          </button>
          <span className="timecode text-xs w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(4, z + 0.25))}
            className="w-6 h-6 text-forge-muted hover:text-forge-text text-xs flex items-center justify-center"
          >
            +
          </button>
        </div>

        <div className="w-px h-5 bg-forge-border" />

        {/* Undo */}
        <button
          onClick={() => {/* TODO undo */}}
          className="text-forge-muted hover:text-forge-text text-xs font-mono"
        >
          ↩ Undo
        </button>
        <button
          onClick={() => {/* TODO redo */}}
          className="text-forge-muted hover:text-forge-text text-xs font-mono"
        >
          ↪ Redo
        </button>

        <div className="flex-1" />

        {/* AI buttons */}
        <button
          onClick={onAITrim}
          className="px-3 py-1 border border-forge-gold text-forge-gold font-bebas text-xs tracking-widest hover:bg-forge-gold/10 transition-all rounded"
        >
          ✦ AI TRIM
        </button>
        <button
          onClick={onAIReorder}
          className="px-3 py-1 border border-forge-gold text-forge-gold font-bebas text-xs tracking-widest hover:bg-forge-gold/10 transition-all rounded"
        >
          ✦ AI REORDER
        </button>
      </div>

      {/* Timeline scrollable area */}
      <div ref={timelineRef} className="flex-1 overflow-x-auto overflow-y-hidden relative">
        <div style={{ width: timelineWidth, minHeight: '100%' }} className="relative">
          {/* Ruler */}
          <div
            className="sticky top-0 z-20 bg-forge-panel border-b border-forge-border cursor-pointer"
            style={{ height: RULER_HEIGHT }}
            onClick={handleRulerClick}
          >
            <div className="absolute inset-0" style={{ left: LABEL_WIDTH }}>
              {ticks.map(t => (
                <RulerTick key={t} time={t} zoom={zoom} />
              ))}
            </div>
          </div>

          {/* Playhead */}
          <div
            className="playhead"
            style={{
              left: playheadTime * PX_PER_SECOND * zoom + LABEL_WIDTH,
              top: 0,
              height: '100%',
            }}
          />

          {/* Tracks */}
          {tracks.map((track) => (
            <div
              key={track.id}
              className="relative border-b border-forge-border flex"
              style={{ height: TRACK_HEIGHT }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, track.id)}
            >
              {/* Track label */}
              <div
                className="flex-shrink-0 flex items-center px-2 border-r border-forge-border bg-forge-panel z-10"
                style={{ width: LABEL_WIDTH }}
              >
                <div
                  className="w-1 h-6 rounded-full mr-2"
                  style={{ background: TRACK_COLORS[track.type] }}
                />
                <span className="font-bebas text-xs tracking-widest text-forge-muted">
                  {track.type}
                </span>
              </div>

              {/* Track clips area */}
              <div
                className={`flex-1 relative ${TRACK_BG[track.type]}`}
                style={{ width: timelineWidth - LABEL_WIDTH }}
              >
                {track.clips.map(clip => (
                  <TimelineClipView
                    key={clip.id}
                    clip={clip}
                    zoom={zoom}
                    isSelected={selectedClipId === clip.id}
                    color={TRACK_COLORS[track.type]}
                    onDragStart={(e) => handleDragStart(e, clip.id, track.id, clip.startTime)}
                    onSelect={() => setSelectedClipId(clip.id)}
                    onRemove={() => onClipRemove(clip.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Bottom padding */}
          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  )
}

function TimelineClipView({
  clip, zoom, isSelected, color, onDragStart, onSelect, onRemove
}: {
  clip: TimelineClipData
  zoom: number
  isSelected: boolean
  color: string
  onDragStart: (e: React.MouseEvent) => void
  onSelect: () => void
  onRemove: () => void
}) {
  const left = clip.startTime * PX_PER_SECOND * zoom
  const width = clip.duration * PX_PER_SECOND * zoom

  return (
    <div
      className={`timeline-clip ${isSelected ? 'selected' : ''}`}
      style={{
        left,
        width: Math.max(4, width),
        borderColor: isSelected ? color : undefined,
        boxShadow: isSelected ? `0 0 0 1px ${color}` : undefined,
      }}
      onMouseDown={(e) => { onSelect(); onDragStart(e) }}
    >
      {/* Trim handles */}
      <div className="trim-handle trim-handle-left" style={{ background: color }} />
      <div className="trim-handle trim-handle-right" style={{ background: color }} />

      {/* Content */}
      <div className="px-1.5 py-1 overflow-hidden h-full flex flex-col justify-center">
        <p className="font-mono text-xs text-forge-text truncate leading-none">
          {clip.clip?.originalName || clip.clipId}
        </p>
        <p className="timecode text-xs opacity-60 mt-0.5">
          {formatTimecode(clip.duration)}
        </p>
      </div>

      {/* Colored top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-70"
        style={{ background: color }}
      />

      {/* Remove button on hover */}
      {isSelected && (
        <button
          onMouseDown={(e) => { e.stopPropagation(); onRemove() }}
          className="absolute top-0.5 right-5 w-4 h-4 text-forge-muted hover:text-forge-red text-xs flex items-center justify-center z-10"
        >
          ✕
        </button>
      )}
    </div>
  )
}
