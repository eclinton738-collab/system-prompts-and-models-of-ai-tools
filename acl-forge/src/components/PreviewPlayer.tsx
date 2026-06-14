'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { ClipMetadata } from '@/lib/types'

type AspectRatio = '16:9' | '9:16' | '1:1' | '2.39:1'

const ASPECT_RATIOS: Record<AspectRatio, string> = {
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16] max-h-full',
  '1:1': 'aspect-square',
  '2.39:1': 'aspect-[2.39/1]',
}

interface Props {
  clip?: ClipMetadata | null
  streamUrl?: string | null
  onTimeUpdate?: (time: number) => void
  playheadTime?: number
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const frames = Math.floor((seconds % 1) * 24)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
}

export function PreviewPlayer({ clip, streamUrl, onTimeUpdate, playheadTime }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !streamUrl) return

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (streamUrl.endsWith('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true })
      hls.loadSource(streamUrl)
      hls.attachMedia(video)
      hlsRef.current = hls
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl
    } else {
      video.src = streamUrl
    }

    video.load()
    setPlaying(false)
    setCurrentTime(0)
  }, [streamUrl])

  useEffect(() => {
    if (playheadTime !== undefined && videoRef.current) {
      videoRef.current.currentTime = playheadTime
    }
  }, [playheadTime])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (playing) { video.pause(); setPlaying(false) }
    else { video.play(); setPlaying(true) }
  }

  const skip = (delta: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + delta))
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !muted
    setMuted(!muted)
  }

  return (
    <div className="flex flex-col h-full bg-forge-bg">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-forge-border">
        <div className="flex items-center gap-2">
          <span className="font-bebas text-xs text-forge-muted tracking-widest">PREVIEW</span>
          {clip && (
            <span className="font-mono text-xs text-forge-muted truncate max-w-32">
              {clip.originalName}
            </span>
          )}
        </div>
        {/* Aspect ratio switcher */}
        <div className="flex items-center gap-1">
          {(['16:9', '9:16', '1:1', '2.39:1'] as AspectRatio[]).map(ratio => (
            <button
              key={ratio}
              onClick={() => setAspectRatio(ratio)}
              className={`px-2 py-0.5 font-mono text-xs rounded transition-colors ${
                aspectRatio === ratio
                  ? 'bg-forge-red text-white'
                  : 'text-forge-muted hover:text-forge-text'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      {/* Video container */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center bg-black relative overflow-hidden scan-lines vignette">
        <div className={`relative w-full h-full flex items-center justify-center`}>
          {streamUrl ? (
            <video
              ref={videoRef}
              className={`max-w-full max-h-full object-contain ${ASPECT_RATIOS[aspectRatio]}`}
              onTimeUpdate={(e) => {
                const t = e.currentTarget.currentTime
                setCurrentTime(t)
                onTimeUpdate?.(t)
              }}
              onDurationChange={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              muted={muted}
            />
          ) : (
            <div className="text-center">
              <div className="text-6xl opacity-10 mb-4">▶</div>
              <p className="font-bebas text-xl text-forge-muted tracking-widest">
                SELECT A CLIP TO PREVIEW
              </p>
              <p className="font-mono text-xs text-forge-muted opacity-50 mt-2">
                Click any clip in the library or timeline
              </p>
            </div>
          )}

          {/* ACL FORGE watermark */}
          <div className="absolute top-3 left-3 opacity-30 pointer-events-none">
            <span className="font-bebas text-xs tracking-widest text-forge-red">ACL FORGE</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-forge-border bg-forge-panel px-4 py-3">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-3">
          <span className="timecode w-20">{formatTime(currentTime)}</span>
          <div
            className="flex-1 h-1 bg-forge-track rounded-full cursor-pointer relative group"
            onClick={(e) => {
              if (!videoRef.current || !duration) return
              const rect = e.currentTarget.getBoundingClientRect()
              const ratio = (e.clientX - rect.left) / rect.width
              videoRef.current.currentTime = ratio * duration
            }}
          >
            <div
              className="h-full bg-forge-red rounded-full"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-forge-red rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: duration ? `calc(${(currentTime / duration) * 100}% - 6px)` : '0' }}
            />
          </div>
          <span className="timecode w-20 text-right">{formatTime(duration)}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => skip(-5)}
            className="text-forge-muted hover:text-forge-text transition-colors font-mono text-xs"
          >
            ◀◀ 5s
          </button>

          <button
            onClick={togglePlay}
            disabled={!streamUrl}
            className="w-10 h-10 rounded-full border-2 border-forge-red text-forge-red hover:bg-forge-red hover:text-white transition-all flex items-center justify-center disabled:opacity-30"
          >
            {playing ? '⏸' : '▶'}
          </button>

          <button
            onClick={() => skip(5)}
            className="text-forge-muted hover:text-forge-text transition-colors font-mono text-xs"
          >
            5s ▶▶
          </button>

          <div className="flex items-center gap-2 ml-4">
            <button onClick={toggleMute} className="text-forge-muted hover:text-forge-text transition-colors">
              {muted ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min={0} max={1} step={0.1}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setVolume(v)
                if (videoRef.current) videoRef.current.volume = v
                if (v > 0 && muted) setMuted(false)
              }}
              className="w-16 accent-forge-red"
            />
          </div>

          <button
            onClick={toggleFullscreen}
            className="ml-2 text-forge-muted hover:text-forge-text transition-colors text-sm"
            title="Fullscreen"
          >
            ⛶
          </button>
        </div>
      </div>
    </div>
  )
}
