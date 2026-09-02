# Multi-stage production Dockerfile for Safe-Circle Backend
FROM node:22-alpine AS base

# Install necessary runtime dependencies (e.g. for native build tools if any)
RUN apk add --no-cache libc6-compat curl

WORKDIR /app

# Install dependencies based on package-lock.json
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application source code
COPY . .

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/uploads && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose backend port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5001/ || exit 0

CMD ["node", "server.js"]
