import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPresignedUploadUrl, buildS3Key } from '@/lib/s3'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const { projectId, originalName, mimeType, size } = await req.json()

  const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const clipId = uuidv4()
  const ext = originalName.split('.').pop() || 'mp4'
  const s3Key = buildS3Key(userId, projectId, `${clipId}.${ext}`)

  const clip = await prisma.clip.create({
    data: {
      id: clipId,
      projectId,
      originalName,
      s3Key,
      mimeType,
      size: BigInt(size || 0),
      uploadStatus: 'PENDING',
    },
  })

  const uploadUrl = await getPresignedUploadUrl(s3Key, mimeType)

  return NextResponse.json({
    clip: { ...clip, size: Number(clip.size) },
    uploadUrl,
  }, { status: 201 })
}
