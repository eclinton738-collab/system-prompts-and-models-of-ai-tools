import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { anthropic, FORGE_SYSTEM_PROMPT, formatClipMetadataForAI } from '@/lib/ai'
import { AIAnalyseRequest } from '@/lib/types'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: AIAnalyseRequest = await req.json()
  const { clipMetadata } = body
  const clipsText = formatClipMetadataForAI(clipMetadata)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: FORGE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyse these ACL footage clips and provide strategic editing intelligence:

CLIPS:
${clipsText}

Provide a JSON response with:
{
  "keyMoments": [{ "clipIndex": number, "timeRange": "00:00-00:05", "type": "impact|emotion|buildup|reaction", "description": "..." }],
  "emotionalArc": { "opening": "...", "peak": "...", "resolution": "..." },
  "recommendedOrder": [array of clip indices],
  "pacingNotes": "...",
  "totalEstimatedDuration": number,
  "strengths": ["..."],
  "suggestions": ["..."]
}

Only return valid JSON.`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ raw: text })
  }
}
