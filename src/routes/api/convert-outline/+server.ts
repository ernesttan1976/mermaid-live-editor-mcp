import { env } from '$lib/util/env';
import { json, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { outline } = await request.json();

    if (!outline || typeof outline !== 'string' || outline.trim().length === 0) {
      return json({ error: 'Outline text is required' }, { status: 400 });
    }

    if (!env.openaiApiKey) {
      return json(
        { error: 'OpenAI API key is not configured. Please set MERMAID_OPENAI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: env.openaiApiKey
    });

    const prompt = `Convert the following outline into a Mermaid flowchart diagram with left-to-right (LR) direction. 

The output should be valid Mermaid syntax starting with "flowchart LR" and should represent the hierarchical structure of the outline as a tree diagram flowing from left to right.

Outline:
${outline}

Return ONLY the Mermaid code, without any markdown code blocks, explanations, or additional text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that converts outlines into Mermaid flowchart diagrams. Always return valid Mermaid syntax for left-to-right flowcharts.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const mermaidCode = completion.choices[0]?.message?.content?.trim() || '';

    if (!mermaidCode) {
      return json({ error: 'Failed to generate Mermaid code' }, { status: 500 });
    }

    // Clean up the response - remove markdown code blocks if present
    const cleanedCode = mermaidCode
      .replace(/^```mermaid\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return json({ mermaidCode: cleanedCode });
  } catch (error) {
    console.error('Error converting outline:', error);
    
    if (error instanceof OpenAI.APIError) {
      return json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};

