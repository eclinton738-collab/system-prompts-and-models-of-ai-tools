import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addVideoProcessingJob } from '@/lib/queue'
import { v4 as uuidv4 } from 'uuid'
import { buildS3Key } from '@/lib/s3'

const hasRedis = !!process.env.REDIS_URL

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const body = await req.json()
  const { projectId, originalName, mimeType, size, s3Key: providedKey } = body

  const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const clipId = uuidv4()
  const ext = originalName.split('.').pop() || 'mp4'
  const s3Key = providedKey || buildS3Key(userId, projectId, `${clipId}.${ext}`)

  const clip = await prisma.clip.create({
    data: {
      id: clipId,
      projectId,
      originalName,
      s3Key,
      mimeType,
      size: BigInt(size || 0),
      uploadStatus: 'UPLOADING',
    },
  })

  return NextResponse.json({ clipId: clip.id, s3Key }, { status: 201 })
}

// Called when upload finishes — queues FFmpeg if Redis available, else marks READY
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const { clipId } = await req.json()

  const clip = await prisma.clip.findFirst({
    where: { id: clipId },
    include: { project: { select: { userId: true } } },
  })

  if (!clip || clip.project.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (hasRedis) {
    // Full path: FFmpeg worker processes the video
    const job = await addVideoProcessingJob({
      clipId: clip.id,
      projectId: clip.projectId,
      userId,
      s3Key: clip.s3Key,
      mimeType: clip.mimeType,
    })
    await prisma.clip.update({
      where: { id: clipId },
      data: { uploadStatus: 'PROCESSING', uploadId: job?.id },
    })
    return NextResponse.json({ jobId: job?.id, mode: 'queued' })
  } else {
    // No-worker path: mark READY immediately (no thumbnail/waveform)
    await prisma.clip.update({
      where: { id: clipId },
      data: { uploadStatus: 'READY' },
    })
    return NextResponse.json({ mode: 'direct' })
  }
}
