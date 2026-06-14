import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; clipId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const project = await prisma.project.findFirst({ where: { id: params.id, userId } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  const updated = await prisma.timelineClip.update({
    where: { id: params.clipId },
    data: {
      ...(body.startTime !== undefined && { startTime: body.startTime }),
      ...(body.duration !== undefined && { duration: body.duration }),
      ...(body.trimIn !== undefined && { trimIn: body.trimIn }),
      ...(body.trimOut !== undefined && { trimOut: body.trimOut }),
      ...(body.position !== undefined && { position: body.position }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; clipId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const project = await prisma.project.findFirst({ where: { id: params.id, userId } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.timelineClip.delete({ where: { id: params.clipId } })

  return NextResponse.json({ success: true })
}
