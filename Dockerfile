# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./
COPY drizzle.config.ts ./

# Build the application
RUN pnpm build

# Production stage
FROM node:22-alpine AS production

# Install pnpm
RUN npm install -g pnpm

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder stage with correct ownership
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy drizzle config and schema for migrations with correct ownership
COPY --from=builder --chown=nodejs:nodejs /app/drizzle.config.ts ./
COPY --from=builder --chown=nodejs:nodejs /app/src/shared/db/schema.ts ./src/shared/db/schema.ts

# Create drizzle directory with correct ownership for migrations
RUN mkdir -p drizzle && chown nodejs:nodejs drizzle

# Switch to non-root user
USER nodejs

# Health check - verify database connectivity as indicator of bot responsiveness
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "import('./dist/shared/db/client.js').then(m => m.sql.raw('SELECT 1')).then(() => process.exit(0)).catch(() => process.exit(1))"

# Start the application
CMD ["node", "dist/index.js"]