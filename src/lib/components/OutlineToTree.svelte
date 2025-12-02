<script lang="ts">
  import Card from '$/components/Card/Card.svelte';
  import { Button } from '$/components/ui/button';
  import { updateCode } from '$lib/util/state';
  import { notify } from '$lib/util/notify';
  import { logEvent } from '$lib/util/stats';
  import TreeIcon from '~icons/material-symbols/account-tree-outline-rounded';

  let outlineText = $state('');
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  const convertOutline = async () => {
    if (!outlineText.trim()) {
      notify('Please enter an outline to convert');
      return;
    }

    isLoading = true;
    error = null;

    try {
      const response = await fetch('/api/convert-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ outline: outlineText })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert outline');
      }

      if (!data.mermaidCode) {
        throw new Error('No Mermaid code returned from API');
      }

      // Update the editor with the generated Mermaid code
      updateCode(data.mermaidCode, {
        resetPanZoom: true,
        updateDiagram: true
      });

      logEvent('convertOutline', { success: true });
      notify('Outline converted successfully!');
      outlineText = ''; // Clear the input after successful conversion
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      error = errorMessage;
      notify(`Error: ${errorMessage}`);
      logEvent('convertOutline', { success: false, error: errorMessage });
    } finally {
      isLoading = false;
    }
  };
</script>

<Card title="Outline to Tree" isOpen isStackable icon={{ component: TreeIcon }}>
  <div class="flex flex-col gap-3 p-2">
    <div class="flex flex-col gap-2">
      <label for="outline-input" class="text-sm font-medium">Enter outline text:</label>
      <textarea
        id="outline-input"
        bind:value={outlineText}
        placeholder="Example:&#10;Main Topic&#10;  Subtopic 1&#10;    Detail A&#10;    Detail B&#10;  Subtopic 2&#10;    Detail C"
        disabled={isLoading}
        class="min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        rows="8"></textarea>
    </div>

    {#if error}
      <div class="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
        {error}
      </div>
    {/if}

    <Button
      onclick={convertOutline}
      disabled={isLoading || !outlineText.trim()}
      class="w-full"
      size="sm">
      {#if isLoading}
        <span class="mr-2">Converting...</span>
      {:else}
        Convert to Tree Diagram
      {/if}
    </Button>

    <p class="text-xs text-muted-foreground">
      This will convert your outline into a left-to-right Mermaid flowchart diagram using AI.
    </p>
  </div>
</Card>

