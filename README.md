[![Join our Discord!](https://img.shields.io/static/v1?message=join%20chat&color=9cf&logo=discord&label=discord)](https://discord.gg/sKeNQX4Wtj)
[![Netlify Status](https://api.netlify.com/api/v1/badges/27fa023d-7c73-4a3f-9791-b3b657a47100/deploy-status)](https://app.netlify.com/sites/mermaidjs/deploys)

# Mermaid Live Editor

Edit, preview and share mermaid charts/diagrams.

## Features

- Edit and preview flowcharts, sequence diagrams, gantt diagrams in real time.
- Save the result as a svg
- Get a link to a viewer of the diagram so that you can share it with others.
- Get a link to edit the diagram so that someone else can tweak it and send a new link back
- **Outline to Tree**: Convert any outline text into a left-to-right Mermaid tree diagram using AI

## Live demo

You can try out a [live version](https://mermaid.live/).

# Contributors are welcome!

If you want to speed up the progress for mermaid-live-editor, join the Discord channel and contact knsv.

## Docker

### Run published image

```bash
docker run --platform linux/amd64 --publish 8000:8080 ghcr.io/mermaid-js/mermaid-live-editor
```

### To configure renderer URL

When building set the MERMAID_RENDERER_URL build argument to the rendering
service.
Example:
Default is`https://mermaid.ink`.
Set to empty string to disable PNG and SVG links under Actions

### To configure Kroki Instance URL

When building set the MERMAID_KROKI_RENDERER_URL build argument to your Kroki
instance.
Default is `https://kroki.io`
Set to empty string to disable Kroki link under Actions

### To configure Analytics

When building set the MERMAID_ANALYTICS_URL build argument to your plausible instance, and MERMAID_DOMAIN to your domain.

Default is empty, disabling analytics.

### To enable Mermaid Chart links and promotion

When building set the MERMAID_IS_ENABLED_MERMAID_CHART_LINKS build argument to `true`

Default is empty, disabling button to save to Mermaid Chart and promotional banner.

### To enable Outline to Tree feature

To use the AI-powered outline to tree diagram converter, set the `MERMAID_OPENAI_API_KEY` environment variable to your OpenAI API key.

**Note**: This feature requires API routes to work. The current setup uses `@sveltejs/adapter-static` which doesn't support API routes in production. For production use, you'll need to switch to `@sveltejs/adapter-node` or `@sveltejs/adapter-auto`.

For development, create a `.env` file in the project root:
```
MERMAID_OPENAI_API_KEY=your-api-key-here
```

The Outline to Tree feature uses OpenAI's GPT-4o-mini model to convert outline text into Mermaid flowchart syntax with left-to-right (LR) direction.

### To update the Security modal

The modal shown on clicking the security link assumes analytics, renderer, Kroki
and Mermaid chart are enabled. You can update it by modifying `Privacy.svelte`
if you wish.

### Development

```bash
docker compose up --build
```

Then open http://localhost:3000

### Building and running images locally

#### Build

```bash
docker build -t mermaid-js/mermaid-live-editor .
```

#### Run

```bash
docker run --detach --name mermaid-live-editor --publish 8080:8080 mermaid-js/mermaid-live-editor
```

Visit: <http://localhost:8080>

#### Stop

```bash
docker stop mermaid-live-editor
```

## Setup

Below link will help you making a copy of the repository in your local system.

https://docs.github.com/en/get-started/quickstart/fork-a-repo

## Requirements

- [Node.js](https://nodejs.org/en/) current LTS version
- [pnpm](https://pnpm.io/) package manager. Install with `corepack enable pnpm`

## Development

```sh
pnpm install
pnpm dev -- --open
```

This app is created with Svelte Kit.

### Environment Variables

For local development, create a `.env` file in the project root with the following variables:

- `MERMAID_OPENAI_API_KEY` - Your OpenAI API key (required for Outline to Tree feature)
- `MERMAID_RENDERER_URL` - URL for the rendering service (optional)
- `MERMAID_KROKI_RENDERER_URL` - URL for Kroki instance (optional)
- `MERMAID_ANALYTICS_URL` - Analytics service URL (optional)
- `MERMAID_DOMAIN` - Domain for analytics (optional)
- `MERMAID_IS_ENABLED_MERMAID_CHART_LINKS` - Set to `true` to enable Mermaid Chart links (optional)

## Release

When a PR is created targeting master, it will be built and deployed by Netlify.
The URL will be indicated in a Comment in the PR.

Once the PR is merged, it will automatically be released.
