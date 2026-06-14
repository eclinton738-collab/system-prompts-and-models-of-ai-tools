import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { anthropic, FORGE_SYSTEM_PROMPT } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, context } = await req.json()

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: FORGE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Write a full narrator voice-over script for this ACL documentary.

CONTEXT: ${context}

Style: 30-for-30 meets African oral tradition. The voice speaks with authority, reverence, and the weight of history. Short punchy sentences. Poetic. Never clichéd.

Format as:
[OPENING]
VO text here...

[ACT 1]
VO text here...

[ACT 2 — THE FIGHT]
VO text here...

[ACT 3 — AFTERMATH]
VO text here...

[CLOSING]
VO text here...

Include [PAUSE 2s], [MUSIC UP], [AMBIENT SOUND] stage directions where powerful. Each section should feel essential, never filler.`,
      },
    ],
  })

  const script = message.content[0].type === 'text' ? message.content[0].text : ''
  return NextResponse.json({ script, projectId })
}
