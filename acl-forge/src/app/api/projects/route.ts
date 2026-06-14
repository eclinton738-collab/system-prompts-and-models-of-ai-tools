import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { clips: true } },
    },
  })

  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const { name, style } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Project name required' }, { status: 400 })
  }

  const project = await prisma.project.create({
    data: {
      userId,
      name: name.trim(),
      style: style || 'war-film',
    },
  })

  await prisma.timelineTrack.createMany({
    data: [
      { projectId: project.id, type: 'VIDEO', order: 0 },
      { projectId: project.id, type: 'AUDIO', order: 1 },
      { projectId: project.id, type: 'VO', order: 2 },
      { projectId: project.id, type: 'FX', order: 3 },
    ],
  })

  return NextResponse.json(project, { status: 201 })
}
