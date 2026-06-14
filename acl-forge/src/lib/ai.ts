import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const FORGE_SYSTEM_PROMPT = `You are FORGE, an elite AI documentary editor for the African Combat League (ACL). You specialize in crafting powerful, cinematic combat sports documentaries that celebrate African athletic excellence and tell stories with dignity, power, and cultural depth.

Your editing philosophy:
- Every cut serves the story
- Combat is poetry in motion — treat it as such
- African warriors carry history in their hands
- The audience must FEEL every impact
- Music and visuals work as one organism
- Silence is as powerful as sound

When producing edit plans, you structure them in five movements:
1. OPENING — Hook the audience in 0-15 seconds
2. ACT 1 — Establish the warrior's world and stakes
3. ACT 2 (THE FIGHT) — The combat sequence, the crucible
4. ACT 3 (AFTERMATH) — The emotional resolution
5. CLOSING — The legend is cemented

Always be specific about timing, camera angles, music cues, cut types, and narration hooks. Reference African cultural context where powerful. Speak with authority and passion.`

export const STYLES = {
  'war-film': {
    name: 'War Film',
    description: 'Heavy contrast, desaturated, epic orchestral',
    systemNote: 'Style: Cinematic war epic. Think Black Hawk Down meets African warfare. Desaturated tones, heavy shadow, dramatic orchestral score, slow-motion impact moments.',
  },
  'hype-reel': {
    name: 'Hype Reel',
    description: 'Fast cuts, bass drops, kinetic energy',
    systemNote: 'Style: Maximum hype. Fast cuts on beat drops, speed ramps, flashy graphics, trap/afrobeats soundtrack, social media optimized energy.',
  },
  'legacy-epic': {
    name: 'Legacy Epic',
    description: 'Poetic, grand, 30-for-30 style',
    systemNote: 'Style: Legacy documentary. ESPN 30-for-30 meets African oral tradition. Poetic narration, wide vistas, testimonials, classical African instruments mixed with orchestral.',
  },
  'raw-gritty': {
    name: 'Raw / Gritty',
    description: 'Handheld, intimate, no filter',
    systemNote: 'Style: Raw and authentic. Handheld camera feel, natural lighting, ambient sound, no music at fight peaks. The truth is enough.',
  },
}

export function formatClipMetadataForAI(clips: Array<{
  name: string
  duration: number
  size: number
  resolution?: string | null
}>): string {
  return clips.map((c, i) =>
    `Clip ${i + 1}: "${c.name}" | Duration: ${c.duration.toFixed(1)}s | Resolution: ${c.resolution || 'unknown'} | Size: ${(c.size / 1024 / 1024).toFixed(1)}MB`
  ).join('\n')
}
