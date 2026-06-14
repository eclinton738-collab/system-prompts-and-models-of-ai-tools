import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addExportJob } from '@/lib/queue'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  const exports = await prisma.export.findMany({
    where: {
      project: { userId },
      ...(projectId && { projectId }),
    },
    orderBy: { createdAt: 'desc' },
    include: { project: { select: { name: true } } },
  })

  return NextResponse.json(exports)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const { projectId, format = 'mp4', resolution = '1080p' } = await req.json()

  const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const exportRecord = await prisma.export.create({
    data: { projectId, format, resolution, status: 'PENDING' },
  })

  const job = await addExportJob({
    exportId: exportRecord.id,
    projectId,
    userId,
    format,
    resolution,
  })

  await prisma.export.update({
    where: { id: exportRecord.id },
    data: { jobId: job.id, status: 'PROCESSING' },
  })

  return NextResponse.json(exportRecord, { status: 201 })
}
