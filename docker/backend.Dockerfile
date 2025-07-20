# Backend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json files
COPY package.json ./
COPY apps/backend/package.json ./apps/backend/
COPY libs/common-types/package.json ./libs/common-types/
COPY libs/utils/package.json ./libs/utils/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY apps/backend ./apps/backend
COPY libs ./libs
COPY tsconfig.json ./

# Build the application
RUN npm run build:backend

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3001

# Run the application
CMD ["node", "dist/apps/backend/server.js"]