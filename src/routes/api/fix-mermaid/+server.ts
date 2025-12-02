import { env } from '$lib/util/env';
import { normalizeMermaidSyntax } from '$lib/util/mermaidNormalize';
import { json, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { mermaidCode, errorMessage } = await request.json();

    if (!mermaidCode || typeof mermaidCode !== 'string' || mermaidCode.trim().length === 0) {
      return json({ error: 'Mermaid code is required' }, { status: 400 });
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

    const prompt = `Fix the following Mermaid flowchart code that has syntax errors.

${errorMessage ? `Error message: ${errorMessage}\n\n` : ''}Broken Mermaid code:
\`\`\`
${mermaidCode}
\`\`\`

IMPORTANT RULES:
1. Return valid Mermaid flowchart syntax
2. Start with: flowchart LR (left-to-right direction)
3. Use simple node IDs (letters, numbers, underscores only)
4. Node labels should be in square brackets [Label]
5. If labels contain special characters, wrap them in quotes: A["Label with (parentheses)"]
6. Use --> for arrows between nodes
7. Fix any syntax errors while preserving the diagram structure
8. Ensure all node IDs are valid (alphanumeric + underscore, can't start with number)

Return ONLY the fixed Mermaid code, without any markdown code blocks, explanations, or additional text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that fixes Mermaid flowchart syntax errors. Always return valid, corrected Mermaid syntax for left-to-right flowcharts. Preserve the diagram structure while fixing syntax issues.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    const fixedCode = completion.choices[0]?.message?.content?.trim() || '';

    if (!fixedCode) {
      return json({ error: 'Failed to fix Mermaid code' }, { status: 500 });
    }

    // Clean up the response - remove markdown code blocks if present
    let cleanedCode = fixedCode
      .replace(/^```mermaid\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Normalize the fixed code
    cleanedCode = normalizeMermaidSyntax(cleanedCode);

    return json({ mermaidCode: cleanedCode });
  } catch (error) {
    console.error('Error fixing Mermaid code:', error);
    
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

