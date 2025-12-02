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

