import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPresignedDownloadUrl } from '@/lib/s3'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const project = await prisma.project.findFirst({
    where: { id: params.id, userId },
    include: {
      clips: { orderBy: { createdAt: 'asc' } },
      timeline: {
        orderBy: { order: 'asc' },
        include: {
          clips: {
            orderBy: { position: 'asc' },
            include: { clip: true },
          },
        },
      },
      exports: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const clipsWithUrls = await Promise.all(
    project.clips.map(async (clip) => {
      const thumbnailUrl = clip.thumbnailKey
        ? await getPresignedDownloadUrl(clip.thumbnailKey).catch(() => null)
        : null
      const streamUrl = clip.uploadStatus === 'READY'
        ? await getPresignedDownloadUrl(clip.s3Key).catch(() => null)
        : null
      return {
        ...clip,
        size: Number(clip.size),
        thumbnailUrl,
        streamUrl,
      }
    })
  )

  return NextResponse.json({
    ...project,
    clips: clipsWithUrls,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const body = await req.json()

  const project = await prisma.project.findFirst({ where: { id: params.id, userId } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.style && { style: body.style }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const project = await prisma.project.findFirst({ where: { id: params.id, userId } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.project.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
