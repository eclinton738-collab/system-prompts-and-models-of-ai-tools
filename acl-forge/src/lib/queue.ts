import { Queue, Job } from 'bullmq'

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

// Queues are optional — if no Redis, jobs are tracked in-DB only
let videoProcessingQueue: Queue | null = null
let exportQueue: Queue | null = null

function getConnection() {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null
  try {
    const url = new URL(redisUrl)
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      maxRetriesPerRequest: null as null,
    }
  } catch {
    return null
  }
}

function getQueues() {
  if (videoProcessingQueue) return { videoProcessingQueue, exportQueue: exportQueue! }
  const conn = getConnection()
  if (!conn) return null
  videoProcessingQueue = new Queue('video-processing', { connection: conn })
  exportQueue = new Queue('export', { connection: conn })
  return { videoProcessingQueue, exportQueue }
}

export async function addVideoProcessingJob(data: VideoProcessingJob): Promise<Job | null> {
  const queues = getQueues()
  if (!queues) return null
  return queues.videoProcessingQueue.add('process-video', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  })
}

export async function addExportJob(data: ExportJob): Promise<Job | null> {
  const queues = getQueues()
  if (!queues) return null
  return queues.exportQueue.add('export-video', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  })
}

export async function getJobStatus(queueName: string, jobId: string) {
  const queues = getQueues()
  if (!queues) return null
  const queue = queueName === 'video-processing' ? queues.videoProcessingQueue : queues.exportQueue
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
