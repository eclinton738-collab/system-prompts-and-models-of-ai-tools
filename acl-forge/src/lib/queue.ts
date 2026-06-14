import { Queue, Worker, Job } from 'bullmq'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const url = new URL(redisUrl)

const connection = {
  host: url.hostname,
  port: parseInt(url.port) || 6379,
  password: url.password || undefined,
  maxRetriesPerRequest: null as null,
}

export const videoProcessingQueue = new Queue('video-processing', { connection })
export const exportQueue = new Queue('export', { connection })

export interface VideoProcessingJob {
  clipId: string
  projectId: string
  userId: string
  s3Key: string
  mimeType: string
}

export interface ExportJob {
  exportId: string
  projectId: string
  userId: string
  format: string
  resolution: string
}

export async function addVideoProcessingJob(data: VideoProcessingJob): Promise<Job> {
  return videoProcessingQueue.add('process-video', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  })
}

export async function addExportJob(data: ExportJob): Promise<Job> {
  return exportQueue.add('export-video', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  })
}

export async function getJobStatus(queueName: string, jobId: string) {
  const queue = queueName === 'video-processing' ? videoProcessingQueue : exportQueue
  const job = await queue.getJob(jobId)
  if (!job) return null

  const state = await job.getState()
  const progress = job.progress as number

  return {
    id: jobId,
    status: state,
    progress: typeof progress === 'number' ? progress : 0,
    result: job.returnvalue,
    error: job.failedReason,
  }
}

export type { connection }
