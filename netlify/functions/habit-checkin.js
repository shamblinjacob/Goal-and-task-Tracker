import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          habitId:    { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          reasoning:  { type: 'string' },
        },
        required: ['habitId', 'confidence', 'reasoning'],
        additionalProperties: false,
      },
    },
  },
  required: ['matches'],
  additionalProperties: false,
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { text, habits } = await req.json()

    if (!text?.trim() || !Array.isArray(habits) || habits.length === 0) {
      return Response.json({ matches: [] })
    }

    const habitsList = habits
      .map(h => `- id: "${h.id}", name: "${h.title}"${h.description ? `, notes: "${h.description}"` : ''}`)
      .join('\n')

    const prompt = `A user is reporting which of their daily habits they just completed. Map their free-form message to their habits.

Available habits:
${habitsList}

User's message: "${text}"

Return the habits they clearly indicate they completed. Skip habits they say they did NOT do, or that they plan to do later. Mark confidence as "high" when they explicitly mention the habit, "medium" when it's a reasonable inference, "low" when it's a stretch.`

    const response = await client.messages.parse({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      output_config: {
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
        effort: 'low',
      },
      messages: [{ role: 'user', content: prompt }],
    })

    return Response.json(response.parsed_output ?? { matches: [] })
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return Response.json(
        { error: err.message, matches: [] },
        { status: err.status >= 400 && err.status < 500 ? 400 : 502 }
      )
    }
    return Response.json({ error: String(err), matches: [] }, { status: 500 })
  }
}
