import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Config: {
  region: string
  credentials: { accessKeyId: string; secretAccessKey: string }
  endpoint?: string
  forcePathStyle?: boolean
} = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
}

if (process.env.S3_ENDPOINT) {
  s3Config.endpoint = process.env.S3_ENDPOINT
  s3Config.forcePathStyle = true
}

export const s3Client = new S3Client(s3Config)

export const S3_BUCKET = process.env.S3_BUCKET!

export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  })
  return getSignedUrl(s3Client, command, { expiresIn })
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(s3Client, command, { expiresIn })
}

export async function deleteS3Object(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })
  )
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

export function buildS3Key(userId: string, projectId: string, filename: string): string {
  return `projects/${userId}/${projectId}/raw/${filename}`
}

export function buildThumbnailKey(userId: string, projectId: string, clipId: string): string {
  return `projects/${userId}/${projectId}/thumbnails/${clipId}.jpg`
}

export function buildHLSKey(userId: string, projectId: string, clipId: string): string {
  return `projects/${userId}/${projectId}/hls/${clipId}/index.m3u8`
}

export function buildExportKey(userId: string, projectId: string, exportId: string, format: string): string {
  return `projects/${userId}/${projectId}/exports/${exportId}.${format}`
}
