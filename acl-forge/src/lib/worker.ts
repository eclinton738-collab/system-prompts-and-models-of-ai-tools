/**
 * Background worker for video processing.
 * Run this separately: npx ts-node src/lib/worker.ts
 * Or use a process manager (PM2, systemd, etc.)
 */

import { Worker } from 'bullmq'
import { VideoProcessingJob, ExportJob } from './queue'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const url = new URL(redisUrl)
const connection = {
  host: url.hostname,
  port: parseInt(url.port) || 6379,
  password: url.password || undefined,
  maxRetriesPerRequest: null as null,
}
import { prisma } from './prisma'
import { s3Client, S3_BUCKET, buildThumbnailKey, buildExportKey } from './s3'
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'

// FFmpeg setup — requires ffmpeg to be installed on the system
// npm install fluent-ffmpeg @types/fluent-ffmpeg
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg')

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

async function downloadFromS3(key: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `acl-forge-${Date.now()}-${path.basename(key)}`)
  const { Body } = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }))
  const buffer = await streamToBuffer(Body as Readable)
  fs.writeFileSync(tmpPath, buffer)
  return tmpPath
}

async function uploadToS3(filePath: string, key: string, contentType: string): Promise<void> {
  const body = fs.readFileSync(filePath)
  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
}

const videoWorker = new Worker(
  'video-processing',
  async (job) => {
    const { clipId, projectId, userId, s3Key, mimeType } = job.data as VideoProcessingJob
    const tmpDir = os.tmpdir()
    let inputPath = ''

    try {
      await job.updateProgress(5)

      // Download from S3
      inputPath = await downloadFromS3(s3Key)
      await job.updateProgress(20)

      // Get video metadata
      const metadata: {
        duration?: number;
        resolution?: string;
        codec?: string;
        fps?: number;
      } = await new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ffmpeg.ffprobe(inputPath, (err: Error, data: any) => {
          if (err) reject(err)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const videoStream = data.streams.find((s: any) => s.codec_type === 'video')
          resolve({
            duration: data.format.duration,
            resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : undefined,
            codec: videoStream?.codec_name,
            fps: videoStream?.r_frame_rate ? eval(videoStream.r_frame_rate) : undefined,
          })
        })
      })

      await job.updateProgress(35)

      // Generate thumbnail
      const thumbKey = buildThumbnailKey(userId, projectId, clipId)
      const thumbPath = path.join(tmpDir, `${clipId}-thumb.jpg`)

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .screenshots({
            timestamps: [1],
            filename: `${clipId}-thumb.jpg`,
            folder: tmpDir,
            size: '320x180',
          })
          .on('end', resolve)
          .on('error', reject)
      })

      await uploadToS3(thumbPath, thumbKey, 'image/jpeg')
      fs.unlinkSync(thumbPath)
      await job.updateProgress(55)

      // Extract waveform data (200 points)
      const waveformPath = path.join(tmpDir, `${clipId}-wave.json`)
      const waveformData: number[] = []

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .audioFilters('aresample=8000,asetnsamples=200,astats=metadata=1:reset=1')
          .format('null')
          .output('/dev/null')
          .on('stderr', (line: string) => {
            const match = line.match(/RMS level dB: ([-\d.]+)/)
            if (match) {
              const db = parseFloat(match[1])
              waveformData.push(Math.max(0, Math.min(1, (db + 60) / 60)))
            }
          })
          .on('end', resolve)
          .on('error', () => resolve()) // Waveform is optional
          .run()
      })

      // Normalize to 200 points
      const normalized = waveformData.length > 0 ? waveformData.slice(0, 200) : Array(200).fill(0.5)
      await job.updateProgress(70)

      // Update clip record
      await prisma.clip.update({
        where: { id: clipId },
        data: {
          uploadStatus: 'READY',
          thumbnailKey: thumbKey,
          duration: metadata.duration || 0,
          resolution: metadata.resolution,
          waveformData: normalized,
        },
      })

      await job.updateProgress(100)

      // Cleanup
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)

      return { success: true, clipId }
    } catch (error) {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath)

      await prisma.clip.update({
        where: { id: clipId },
        data: { uploadStatus: 'FAILED' },
      })

      throw error
    }
  },
  { connection, concurrency: 2 }
)

const exportWorker = new Worker(
  'export',
  async (job) => {
    const { exportId, projectId, userId, format, resolution } = job.data as ExportJob
    const tmpDir = os.tmpdir()
    const inputPaths: string[] = []

    try {
      await job.updateProgress(5)

      // Get timeline data
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          timeline: {
            where: { type: 'VIDEO' },
            include: {
              clips: {
                orderBy: { startTime: 'asc' },
                include: { clip: true },
              },
            },
          },
        },
      })

      if (!project) throw new Error('Project not found')

      const videoTrack = project.timeline[0]
      if (!videoTrack || videoTrack.clips.length === 0) {
        throw new Error('No video clips on timeline')
      }

      await job.updateProgress(15)

      // Download all clips
      const clipPaths: Array<{ path: string; startTime: number; duration: number; trimIn: number }> = []

      for (let i = 0; i < videoTrack.clips.length; i++) {
        const tc = videoTrack.clips[i]
        if (!tc.clip) continue
        const p = await downloadFromS3(tc.clip.s3Key)
        inputPaths.push(p)
        clipPaths.push({ path: p, startTime: tc.startTime, duration: tc.duration, trimIn: tc.trimIn })
        await job.updateProgress(15 + (i / videoTrack.clips.length) * 40)
      }

      // Resolution mapping
      const resMap: Record<string, string> = {
        '4K': '3840x2160',
        '1080p': '1920x1080',
        '720p': '1280x720',
      }
      const outputSize = resMap[resolution] || '1920x1080'

      // Build concat list
      const concatListPath = path.join(tmpDir, `${exportId}-concat.txt`)
      const concatList = clipPaths.map(c => `file '${c.path}'\n`).join('')
      fs.writeFileSync(concatListPath, concatList)

      const outputPath = path.join(tmpDir, `${exportId}.${format}`)

      await job.updateProgress(60)

      // FFmpeg export
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(concatListPath)
          .inputOptions(['-f concat', '-safe 0'])
          .videoFilter(`scale=${outputSize}:force_original_aspect_ratio=decrease,pad=${outputSize}:(ow-iw)/2:(oh-ih)/2`)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions(['-crf 18', '-preset slow', '-movflags +faststart'])
          .output(outputPath)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .on('progress', (progress: any) => {
            if (progress.percent) {
              job.updateProgress(60 + progress.percent * 0.35)
            }
          })
          .on('end', resolve)
          .on('error', reject)
          .run()
      })

      await job.updateProgress(95)

      // Upload to S3
      const s3Key = buildExportKey(userId, projectId, exportId, format)
      await uploadToS3(outputPath, s3Key, format === 'mp4' ? 'video/mp4' : 'video/quicktime')

      // Update export record
      await prisma.export.update({
        where: { id: exportId },
        data: { status: 'COMPLETED', s3Key },
      })

      // Cleanup
      inputPaths.forEach(p => { try { fs.unlinkSync(p) } catch { /* ignore */ } })
      try { fs.unlinkSync(outputPath) } catch { /* ignore */ }
      try { fs.unlinkSync(concatListPath) } catch { /* ignore */ }

      await job.updateProgress(100)
      return { success: true, exportId, s3Key }
    } catch (error) {
      inputPaths.forEach(p => { try { fs.unlinkSync(p) } catch { /* ignore */ } })

      await prisma.export.update({
        where: { id: exportId },
        data: { status: 'FAILED' },
      })

      throw error
    }
  },
  { connection, concurrency: 1 }
)

videoWorker.on('completed', (job) => console.log(`✅ Video processed: ${job.id}`))
videoWorker.on('failed', (job, err) => console.error(`❌ Video failed: ${job?.id}`, err))
exportWorker.on('completed', (job) => console.log(`✅ Export complete: ${job.id}`))
exportWorker.on('failed', (job, err) => console.error(`❌ Export failed: ${job?.id}`, err))

console.log('🔨 ACL FORGE Worker running — processing videos and exports...')
