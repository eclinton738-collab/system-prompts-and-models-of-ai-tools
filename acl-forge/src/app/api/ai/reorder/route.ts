import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { anthropic, FORGE_SYSTEM_PROMPT } from '@/lib/ai'
import { AIReorderRequest } from '@/lib/types'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: AIReorderRequest = await req.json()
  const { clips, currentOrder } = body

  const clipsText = clips.map((c, i) =>
    `${i}: "${c.name}" | ${c.duration.toFixed(1)}s | ${c.resolution || 'unknown'}`
  ).join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: FORGE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Determine the optimal clip order for this ACL documentary sequence.

CLIPS (current order):
${clipsText}

Current order: [${currentOrder.join(', ')}]

Return JSON:
{
  "recommendedOrder": ["clipId1", "clipId2", ...],
  "reasoning": "...",
  "narrativeArc": "..."
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
