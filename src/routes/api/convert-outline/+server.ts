import { env } from '$lib/util/env';
import { normalizeMermaidSyntax } from '$lib/util/mermaidNormalize';
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

IMPORTANT RULES:
1. Start with exactly: flowchart LR
2. Use simple node IDs (letters, numbers, no spaces or special characters except underscores)
3. Node labels should be in square brackets [Label] or parentheses (Label) or curly braces {Label}
4. Use --> for arrows between nodes
5. Keep node labels simple - avoid parentheses, commas, or special characters in labels that could break parsing
6. If a label contains special characters, wrap it in quotes: A["Label with (parentheses)"]
7. Each line should be: NodeID[Label] --> NextNodeID[Label]
8. Represent the hierarchical structure as a tree flowing from left to right

Example format:
flowchart LR
    A[Root] --> B[Child 1]
    A --> C[Child 2]
    B --> D[Grandchild 1]
    B --> E[Grandchild 2]

Outline:
${outline}

Return ONLY the Mermaid code, without any markdown code blocks, explanations, or additional text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that converts outlines into Mermaid flowchart diagrams. Always return valid Mermaid syntax for left-to-right flowcharts. Follow the syntax rules strictly: use simple node IDs, wrap labels in brackets, use --> for arrows, and avoid special characters in node IDs.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    const mermaidCode = completion.choices[0]?.message?.content?.trim() || '';

    if (!mermaidCode) {
      return json({ error: 'Failed to generate Mermaid code' }, { status: 500 });
    }

    // Clean up the response - remove markdown code blocks if present
    let cleanedCode = mermaidCode
      .replace(/^```mermaid\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Normalize and fix common syntax issues
    cleanedCode = normalizeMermaidSyntax(cleanedCode);

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

