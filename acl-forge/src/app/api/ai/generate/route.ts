import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { anthropic, FORGE_SYSTEM_PROMPT, STYLES, formatClipMetadataForAI } from '@/lib/ai'
import { AIGenerateRequest } from '@/lib/types'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body: AIGenerateRequest = await req.json()
  const { style, prompt, clipMetadata, music, targetDuration } = body

  const styleInfo = STYLES[style] || STYLES['war-film']
  const clipsText = formatClipMetadataForAI(clipMetadata)

  const userMessage = `
DOCUMENTARY BRIEF:
${prompt}

STYLE: ${styleInfo.name}
${styleInfo.systemNote}

AVAILABLE FOOTAGE:
${clipsText}

MUSIC TRACK: ${music || 'To be determined'}
TARGET DURATION: ${targetDuration ? `${targetDuration} seconds` : 'Natural length'}

Produce a complete, detailed cinematic edit plan for this ACL documentary. Structure it with OPENING, ACT 1, ACT 2 (THE FIGHT), ACT 3 (AFTERMATH), and CLOSING.

For each section include:
- Exact clip selections and trim points
- Cut type (hard cut, dissolve, smash cut, etc.)
- Music cue descriptions and timing
- Narration/VO hooks
- Visual effects or colour grade notes
- Pacing notes

Be specific, powerful, and authentic to the African combat sports world.`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: FORGE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        })

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
            controller.enqueue(encoder.encode(data))
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'AI generation failed'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
