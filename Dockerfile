# Multi-stage build for SearXNG MCP Server
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npx tsc --project .

# Remove dev dependencies after build
RUN npm prune --omit=dev

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S searxng -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules

# Change ownership to non-root user
RUN chown -R searxng:nodejs /app
USER searxng

# Expose port for HTTP transport
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))" || exit 1

# Use dumb-init to handle signals properly and set default command
ENTRYPOINT ["dumb-init", "--", "node", "build/index.js"]
