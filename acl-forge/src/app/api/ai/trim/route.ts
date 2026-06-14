import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { anthropic, FORGE_SYSTEM_PROMPT } from '@/lib/ai'
import { AITrimRequest } from '@/lib/types'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: AITrimRequest = await req.json()
  const { timelineState } = body

  const tracksText = timelineState.tracks.map(track => {
    const clips = track.clips.map(c =>
      `  Clip: ${c.clip?.originalName || c.clipId} | Pos: ${c.startTime.toFixed(1)}s | Dur: ${c.duration.toFixed(1)}s | TrimIn: ${c.trimIn.toFixed(1)}s | TrimOut: ${c.trimOut.toFixed(1)}s`
    ).join('\n')
    return `${track.type} TRACK:\n${clips || '  (empty)'}`
  }).join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: FORGE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyse this ACL documentary timeline and recommend specific trim adjustments for maximum impact:

TIMELINE (Total: ${timelineState.totalDuration.toFixed(1)}s):
${tracksText}

Return JSON:
{
  "recommendations": [
    {
      "clipId": "...",
      "track": "VIDEO|AUDIO|VO|FX",
      "newTrimIn": number,
      "newTrimOut": number,
      "reason": "..."
    }
  ],
  "overallPacingNote": "...",
  "suggestedTotalDuration": number
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
