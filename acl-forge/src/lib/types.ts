export type UploadStatus = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'
export type TrackType = 'VIDEO' | 'AUDIO' | 'VO' | 'FX'
export type ExportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
export type DocumentaryStyle = 'war-film' | 'hype-reel' | 'legacy-epic' | 'raw-gritty'

export interface ClipMetadata {
  id: string
  projectId: string
  originalName: string
  s3Key: string
  thumbnailKey?: string | null
  thumbnailUrl?: string
  streamUrl?: string
  duration: number
  size: bigint | number
  mimeType: string
  resolution?: string | null
  uploadStatus: UploadStatus
  waveformData?: number[] | null
  uploadProgress?: number
  createdAt: Date
  updatedAt: Date
}

export interface TimelineClipData {
  id: string
  trackId: string
  clipId: string
  startTime: number
  duration: number
  trimIn: number
  trimOut: number
  position: number
  clip?: ClipMetadata
}

export interface TimelineTrackData {
  id: string
  projectId: string
  type: TrackType
  order: number
  clips: TimelineClipData[]
}

export interface ProjectData {
  id: string
  userId: string
  name: string
  style: DocumentaryStyle
  createdAt: Date
  updatedAt: Date
  clips?: ClipMetadata[]
  timeline?: TimelineTrackData[]
  _count?: { clips: number }
}

export interface ExportData {
  id: string
  projectId: string
  status: ExportStatus
  s3Key?: string | null
  format: string
  resolution: string
  downloadUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface AIGenerateRequest {
  projectId: string
  style: DocumentaryStyle
  prompt: string
  clipMetadata: Array<{
    name: string
    duration: number
    size: number
    resolution?: string | null
  }>
  music?: string
  targetDuration?: number
}

export interface AIAnalyseRequest {
  clipMetadata: Array<{
    id: string
    name: string
    duration: number
    size: number
    resolution?: string | null
  }>
}

export interface AITrimRequest {
  timelineState: {
    tracks: TimelineTrackData[]
    totalDuration: number
  }
}

export interface AIReorderRequest {
  clips: Array<{
    id: string
    name: string
    duration: number
    resolution?: string | null
  }>
  currentOrder: string[]
}

export interface JobStatus {
  id: string
  status: 'waiting' | 'active' | 'completed' | 'failed'
  progress: number
  result?: Record<string, unknown>
  error?: string
}
