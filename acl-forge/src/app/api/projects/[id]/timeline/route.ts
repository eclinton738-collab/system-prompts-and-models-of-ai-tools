import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const project = await prisma.project.findFirst({ where: { id: params.id, userId } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { trackId, clipId, startTime, duration, trimIn, trimOut, position } = await req.json()

  const timelineClip = await prisma.timelineClip.create({
    data: {
      trackId,
      clipId,
      startTime,
      duration,
      trimIn: trimIn ?? 0,
      trimOut: trimOut ?? 0,
      position: position ?? 0,
    },
    include: { clip: true },
  })

  return NextResponse.json({
    ...timelineClip,
    clip: timelineClip.clip ? {
      ...timelineClip.clip,
      size: Number(timelineClip.clip.size),
    } : null,
  }, { status: 201 })
}
