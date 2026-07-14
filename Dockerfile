# ─────────────────────────────────────────────
# Stage 1: Builder
# Install ALL dependencies and compile TypeScript
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first to leverage Docker layer caching.
# If package.json hasn't changed, npm install is skipped.
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for tsc)
RUN npm ci

# Copy source files and compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: Production
# Lean image with only runtime artifacts
# ─────────────────────────────────────────────
FROM node:20-alpine AS production

# Set production environment — disables dev tooling
ENV NODE_ENV=production

WORKDIR /app

# Copy manifests
COPY package.json package-lock.json ./

# Install ONLY production dependencies (no tsc, no prettier, etc.)
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JS from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the Prometheus metrics port (MCP itself runs over stdio)
EXPOSE 9090

# Run as non-root for security
USER node

# Start the MCP server
CMD ["node", "dist/index.js"]
