import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getJobStatus } from '@/lib/queue'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const queue = searchParams.get('queue') || 'video-processing'

  const status = await getJobStatus(queue, params.id)
  if (!status) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  return NextResponse.json(status)
}
