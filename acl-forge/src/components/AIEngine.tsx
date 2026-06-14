'use client'

import { useState } from 'react'
import { ClipMetadata, DocumentaryStyle, TimelineTrackData } from '@/lib/types'

const STYLES: Array<{ value: DocumentaryStyle; label: string; icon: string; desc: string }> = [
  { value: 'war-film', label: 'War Film', icon: '⚔', desc: 'Heavy contrast, epic orchestral' },
  { value: 'hype-reel', label: 'Hype Reel', icon: '⚡', desc: 'Fast cuts, bass drops, kinetic' },
  { value: 'legacy-epic', label: 'Legacy Epic', icon: '👑', desc: 'Poetic, grand, 30-for-30' },
  { value: 'raw-gritty', label: 'Raw / Gritty', icon: '🎥', desc: 'Handheld, intimate, no filter' },
]

const MUSIC_OPTIONS = [
  'Afrobeats — High Energy',
  'Traditional African Drums',
  'Epic Orchestral',
  'Trap / Grime',
  'Jazz / Soul',
  'Ambient / Cinematic',
  'No Music (Ambient Only)',
]

const AI_TOGGLES = [
  { key: 'autoCut', label: 'Auto-cut on impact moments' },
  { key: 'beatSync', label: 'Beat-sync to music' },
  { key: 'colorGrade', label: 'AI colour grade' },
  { key: 'titleCards', label: 'Auto-title cards' },
  { key: 'narration', label: 'Commentary narration (TTS)' },
  { key: 'slowMo', label: 'Slow-motion detection' },
]

interface Props {
  projectId: string
  clips: ClipMetadata[]
  style: DocumentaryStyle
  timeline?: TimelineTrackData[]
  onStyleChange: (style: DocumentaryStyle) => void
  onAnalysisComplete?: (result: Record<string, unknown>) => void
}

export function AIEngine({
  projectId, clips, style, timeline, onStyleChange, onAnalysisComplete
}: Props) {
  const [selectedStyle, setSelectedStyle] = useState<DocumentaryStyle>(style)
  const [music, setMusic] = useState(MUSIC_OPTIONS[0])
  const [duration, setDuration] = useState(120)
  const [prompt, setPrompt] = useState('')
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    autoCut: true, beatSync: true, colorGrade: false,
    titleCards: false, narration: false, slowMo: true,
  })
  const [generating, setGenerating] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null)

  const readyClips = clips.filter(c => c.uploadStatus === 'READY')

  const handleGenerate = async () => {
    if (readyClips.length === 0) {
      alert('Add some clips to the project first (they must be fully uploaded and processed).')
      return
    }

    setGenerating(true)
    setStreamedText('')
    setShowModal(true)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          style: selectedStyle,
          prompt: prompt || `Create a powerful ACL documentary for this African Combat League footage. Make it epic and authentic.`,
          music,
          targetDuration: duration,
          clipMetadata: readyClips.map(c => ({
            name: c.originalName,
            duration: c.duration,
            size: Number(c.size),
            resolution: c.resolution,
          })),
        }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                setStreamedText(prev => prev + parsed.text)
              }
            } catch { /* skip non-JSON */ }
          }
        }
      }
    } catch (error) {
      setStreamedText('⚠ Generation failed. Check your API key and connection.')
    } finally {
      setGenerating(false)
    }
  }

  const handleAnalyse = async () => {
    if (readyClips.length === 0) {
      alert('Add some processed clips first.')
      return
    }

    setAnalysing(true)

    try {
      const res = await fetch('/api/ai/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipMetadata: readyClips.map(c => ({
            id: c.id,
            name: c.originalName,
            duration: c.duration,
            size: Number(c.size),
            resolution: c.resolution,
          })),
        }),
      })
      const result = await res.json()
      setAnalysisResult(result)
      onAnalysisComplete?.(result)
      setShowModal(true)
      setStreamedText(JSON.stringify(result, null, 2))
    } catch {
      alert('Analysis failed. Check your connection.')
    } finally {
      setAnalysing(false)
    }
  }

  const handleAITrim = async () => {
    if (!timeline) return
    const totalDuration = timeline.reduce((acc, track) => {
      return Math.max(acc, ...track.clips.map(c => c.startTime + c.duration))
    }, 0)

    const res = await fetch('/api/ai/trim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timelineState: { tracks: timeline, totalDuration } }),
    })
    const result = await res.json()
    setStreamedText(JSON.stringify(result, null, 2))
    setShowModal(true)
  }

  const handleStyleChange = (s: DocumentaryStyle) => {
    setSelectedStyle(s)
    onStyleChange(s)
  }

  return (
    <div className="flex flex-col h-full bg-forge-panel border-l border-forge-border overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-forge-border">
        <span className="font-bebas text-sm tracking-widest text-forge-gold">AI ENGINE</span>
        <p className="font-mono text-xs text-forge-muted mt-0.5">
          {readyClips.length}/{clips.length} clips ready
        </p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-5 overflow-y-auto">
        {/* Style selector */}
        <div>
          <label className="block font-mono text-xs text-forge-muted uppercase tracking-widest mb-3">
            Documentary Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map(s => (
              <button
                key={s.value}
                onClick={() => handleStyleChange(s.value)}
                className={`style-card p-3 text-left ${selectedStyle === s.value ? 'active' : ''}`}
              >
                <div className="text-lg mb-1">{s.icon}</div>
                <div className="font-bebas text-sm tracking-wide text-forge-text">{s.label}</div>
                <div className="font-mono text-xs text-forge-muted mt-0.5 leading-tight">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Toggles */}
        <div>
          <label className="block font-mono text-xs text-forge-muted uppercase tracking-widest mb-3">
            AI Features
          </label>
          <div className="space-y-2">
            {AI_TOGGLES.map(toggle => (
              <button
                key={toggle.key}
                onClick={() => setToggles(prev => ({ ...prev, [toggle.key]: !prev[toggle.key] }))}
                className={`ai-toggle w-full flex items-center justify-between ${toggles[toggle.key] ? 'active' : ''}`}
              >
                <span className="font-mono text-xs text-forge-text">{toggle.label}</span>
                <div className={`w-8 h-4 rounded-full transition-colors relative ${
                  toggles[toggle.key] ? 'bg-forge-gold' : 'bg-forge-border'
                }`}>
                  <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${
                    toggles[toggle.key] ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Music & Duration */}
        <div className="space-y-3">
          <div>
            <label className="block font-mono text-xs text-forge-muted uppercase tracking-widest mb-2">
              Music Track
            </label>
            <select
              value={music}
              onChange={e => setMusic(e.target.value)}
              className="forge-input w-full px-3 py-2 text-xs"
            >
              {MUSIC_OPTIONS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-xs text-forge-muted uppercase tracking-widest mb-2">
              Target Duration: <span className="text-forge-gold">{duration}s</span>
            </label>
            <input
              type="range"
              min={30} max={600} step={15}
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value))}
              className="w-full accent-forge-gold"
            />
            <div className="flex justify-between font-mono text-xs text-forge-muted mt-1">
              <span>30s</span>
              <span>5m</span>
              <span>10m</span>
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div>
          <label className="block font-mono text-xs text-forge-muted uppercase tracking-widest mb-2">
            Your Vision
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe your documentary... e.g. 'Focus on the fighter's journey from Lagos to the championship. Show the hunger, the sacrifice, the triumph.'"
            rows={4}
            className="forge-input w-full px-3 py-2 text-xs resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-4 border-t border-forge-border space-y-2">
        <button
          onClick={handleAnalyse}
          disabled={analysing || readyClips.length === 0}
          className="w-full py-3 border border-forge-gold text-forge-gold font-bebas tracking-widest text-sm hover:bg-forge-gold/10 transition-all disabled:opacity-40 rounded"
        >
          {analysing ? '⏳ ANALYSING...' : '🔬 ANALYSE CLIPS'}
        </button>

        <button
          onClick={handleGenerate}
          disabled={generating || readyClips.length === 0}
          className="w-full btn-forge py-3 font-bebas tracking-widest text-lg disabled:opacity-40"
        >
          {generating ? '⚙ FORGING...' : '🔥 GENERATE DOCUMENTARY'}
        </button>
      </div>

      {/* AI Output Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="forge-modal-gold forge-modal w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-forge-border">
              <div>
                <h2 className="font-bebas text-2xl tracking-widest text-forge-gold">
                  FORGE AI OUTPUT
                </h2>
                {generating && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-forge-gold rounded-full animate-pulse-red" />
                    <span className="font-mono text-xs text-forge-gold">GENERATING...</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => { setShowModal(false); setStreamedText('') }}
                className="text-forge-muted hover:text-forge-text w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {streamedText ? (
                <pre className="ai-stream-text whitespace-pre-wrap">{streamedText}</pre>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <div className="text-forge-gold font-mono text-sm animate-pulse">
                    FORGE is thinking...
                  </div>
                </div>
              )}
            </div>

            {!generating && streamedText && (
              <div className="px-6 py-4 border-t border-forge-border flex gap-3">
                <button
                  onClick={() => navigator.clipboard.writeText(streamedText)}
                  className="flex-1 py-2 border border-forge-gold text-forge-gold font-bebas tracking-widest text-sm hover:bg-forge-gold/10 transition-all rounded"
                >
                  COPY
                </button>
                <button
                  onClick={() => { setShowModal(false); setStreamedText('') }}
                  className="flex-1 btn-forge py-2 font-bebas tracking-widest"
                >
                  CLOSE
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
