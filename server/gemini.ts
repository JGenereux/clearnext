import Groq from 'groq-sdk';

let client: Groq | null = null;

function getClient(): Groq | null {
  if (client) return client;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  client = new Groq({ apiKey });
  return client;
}

export async function callAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const groq = getClient();
  if (!groq) return null;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    return response.choices[0]?.message?.content || null;
  } catch (err) {
    console.error('Groq API error:', (err as Error).message);
    return null;
  }
}
