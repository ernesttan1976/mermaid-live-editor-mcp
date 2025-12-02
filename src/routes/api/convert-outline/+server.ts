import { env } from '$lib/util/env';
import { json, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';

/**
 * Normalizes Mermaid flowchart syntax to ensure it's valid and consistent
 */
export function normalizeMermaidSyntax(code: string): string {
  let normalized = code.trim();

  // Ensure it starts with flowchart LR
  if (!normalized.match(/^flowchart\s+(LR|lr|L-R|l-r)/i)) {
    // Try to fix common variations
    normalized = normalized.replace(/^flowchart\s+/, 'flowchart LR\n    ');
    if (!normalized.startsWith('flowchart')) {
      normalized = 'flowchart LR\n    ' + normalized;
    } else if (!normalized.includes('LR')) {
      normalized = normalized.replace(/^flowchart\s+/, 'flowchart LR\n    ');
    }
  } else {
    // Normalize to lowercase LR
    normalized = normalized.replace(/^flowchart\s+(LR|lr|L-R|l-r)/i, 'flowchart LR');
  }

  // Split into lines for processing
  const lines = normalized.split('\n');
  const result: string[] = [];
  const nodeIdMap = new Map<string, string>(); // Map original IDs to sanitized IDs
  let nodeCounter = 0;

  // Generate a safe node ID
  const getSafeNodeId = (originalId: string, label: string): string => {
    if (nodeIdMap.has(originalId)) {
      return nodeIdMap.get(originalId)!;
    }

    // Try to create a clean ID from the original
    let safeId = originalId
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[0-9]/, 'N$&') // Can't start with number
      .substring(0, 20); // Limit length

    // If empty or invalid, generate one
    if (!safeId || safeId === '_') {
      safeId = `N${nodeCounter++}`;
    }

    // Ensure uniqueness
    let finalId = safeId;
    let counter = 0;
    while (nodeIdMap.has(finalId) || Array.from(nodeIdMap.values()).includes(finalId)) {
      finalId = `${safeId}${counter++}`;
    }

    nodeIdMap.set(originalId, finalId);
    return finalId;
  };

  // Process each line
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('%%')) {
      continue;
    }

    // Skip the flowchart declaration line (already handled)
    if (trimmed.match(/^flowchart\s+LR/i)) {
      result.push('flowchart LR');
      continue;
    }

    // Match arrow patterns: NodeID[Label] --> NextNodeID[Label]
    // More flexible pattern to handle various formats
    const arrowMatch = trimmed.match(/^([A-Za-z0-9_]+)(\[[^\]]*\]|\([^)]*\)|\{[^}]*\}|"[^"]*"|'[^']*')?\s*(-->|->|--|->>|==>|==>>|--->)\s*([A-Za-z0-9_]+)(\[[^\]]*\]|\([^)]*\)|\{[^}]*\}|"[^"]*"|'[^']*')?/);
    
    if (arrowMatch) {
      const [, fromId, fromLabel, arrow, toId, toLabel] = arrowMatch;
      
      // Normalize arrow to -->
      const normalizedArrow = '-->';
      
      // Get safe node IDs
      const safeFromId = getSafeNodeId(fromId, fromLabel || '');
      const safeToId = getSafeNodeId(toId, toLabel || '');
      
      // Normalize labels - ensure they're properly quoted if they contain special chars
      const normalizeLabel = (label: string | undefined): string => {
        if (!label) return '';
        
        // Remove existing brackets/quotes to get the raw text
        let rawLabel = label
          .replace(/^\[(.*)\]$/, '$1')
          .replace(/^\((.*)\)$/, '$1')
          .replace(/^\{(.*)\}$/, '$1')
          .replace(/^"(.*)"$/, '$1')
          .replace(/^'(.*)'$/, '$1')
          .trim();
        
        // If empty, return empty
        if (!rawLabel) return '';
        
        // Clean up common issues: remove extra whitespace, normalize quotes
        rawLabel = rawLabel
          .replace(/\s+/g, ' ')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        
        // If label contains special characters that need escaping, wrap in quotes
        // Special chars that need quoting: parentheses, brackets, braces, commas, pipes
        if (/[()\[\]{}<>,|]/.test(rawLabel) || rawLabel.includes('-->') || rawLabel.includes('->')) {
          // Escape quotes and backslashes in the label
          rawLabel = rawLabel
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"');
          return `["${rawLabel}"]`;
        }
        
        // Otherwise use square brackets (standard format)
        return `[${rawLabel}]`;
      };
      
      const normalizedFromLabel = normalizeLabel(fromLabel);
      const normalizedToLabel = normalizeLabel(toLabel);
      
      result.push(`    ${safeFromId}${normalizedFromLabel} ${normalizedArrow} ${safeToId}${normalizedToLabel}`);
    } else {
      // If it doesn't match the pattern, try to preserve it (might be valid syntax we don't recognize)
      // But skip if it looks like it might cause issues
      if (!trimmed.includes('-->') && !trimmed.includes('->')) {
        continue; // Skip lines that don't look like valid Mermaid
      }
      // Try to fix common issues
      let fixed = trimmed
        .replace(/\s*-->\s*/g, ' --> ')
        .replace(/\s*->\s*/g, ' --> ');
      result.push(fixed);
    }
  }

  // Join and ensure we have at least one connection
  let finalCode = result.join('\n');
  
  // If no connections were found, return a simple error structure
  if (!finalCode.includes('-->')) {
    throw new Error('Could not parse outline into valid flowchart structure');
  }

  return finalCode;
}

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

