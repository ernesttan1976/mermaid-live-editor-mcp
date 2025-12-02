FROM docker.io/library/node:22.15.0-alpine3.21 AS mermaid-live-editor-dependencies

RUN apk --no-cache add build-base git python3 && \
    rm -rf /var/cache/apk/*

RUN corepack enable pnpm

WORKDIR /app

COPY ./package.json .
COPY ./pnpm-lock.yaml .

RUN pnpm install

FROM mermaid-live-editor-dependencies AS mermaid-live-editor-builder

ARG MERMAID_RENDERER_URL
ARG MERMAID_KROKI_RENDERER_URL
ARG MERMAID_ANALYTICS_URL
ARG MERMAID_DOMAIN
ARG MERMAID_IS_ENABLED_MERMAID_CHART_LINKS
ARG MERMAID_OPENAI_API_KEY

COPY . ./

RUN pnpm build

FROM mermaid-live-editor-builder AS mermaid-dev

ENTRYPOINT ["pnpm", "dev"]

FROM docker.io/library/node:22.15.0-alpine3.21 AS mermaid

RUN apk --no-cache add dumb-init

WORKDIR /app

# Copy built application
COPY --from=mermaid-live-editor-builder /app/build ./build
COPY --from=mermaid-live-editor-builder /app/package.json ./package.json
COPY --from=mermaid-live-editor-builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Pass through environment variables at runtime
ARG MERMAID_OPENAI_API_KEY
ENV MERMAID_OPENAI_API_KEY=${MERMAID_OPENAI_API_KEY}

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "build"]
