import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addVideoProcessingJob } from '@/lib/queue'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const body = await req.json()

  const clip = await prisma.clip.findFirst({
    where: { id: params.id },
    include: { project: { select: { userId: true } } },
  })

  if (!clip || clip.project.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.clip.update({
    where: { id: params.id },
    data: {
      ...(body.uploadStatus && { uploadStatus: body.uploadStatus }),
      ...(body.duration !== undefined && { duration: body.duration }),
      ...(body.size !== undefined && { size: BigInt(body.size) }),
    },
  })

  if (body.uploadStatus === 'UPLOADING' && body.triggerProcessing) {
    const job = await addVideoProcessingJob({
      clipId: clip.id,
      projectId: clip.projectId,
      userId,
      s3Key: clip.s3Key,
      mimeType: clip.mimeType,
    })

    await prisma.clip.update({
      where: { id: params.id },
      data: { uploadStatus: 'PROCESSING', uploadId: job.id },
    })
  }

  return NextResponse.json({ ...updated, size: Number(updated.size) })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!

  const clip = await prisma.clip.findFirst({
    where: { id: params.id },
    include: { project: { select: { userId: true } } },
  })

  if (!clip || clip.project.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.clip.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
