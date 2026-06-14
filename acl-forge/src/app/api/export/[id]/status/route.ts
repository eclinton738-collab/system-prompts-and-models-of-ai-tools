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

  const exportRecord = await prisma.export.findFirst({
    where: {
      id: params.id,
      project: { userId },
    },
  })

  if (!exportRecord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let downloadUrl: string | null = null
  if (exportRecord.status === 'COMPLETED' && exportRecord.s3Key) {
    downloadUrl = await getPresignedDownloadUrl(exportRecord.s3Key, 7200).catch(() => null)
  }

  return NextResponse.json({ ...exportRecord, downloadUrl })
}
