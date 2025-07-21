# Backend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json files and lockfile
COPY package.json ./
COPY package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY libs/common-types/package.json ./libs/common-types/
COPY libs/utils/package.json ./libs/utils/

# Install dependencies
RUN npm ci

# Copy source code
COPY apps/backend ./apps/backend
COPY libs ./libs
COPY tsconfig.json ./

# Build the libraries first
RUN npm run build --workspace=libs/common-types
RUN npm run build --workspace=libs/utils

# Build the application
RUN npm run build --workspace=apps/backend
RUN ls -la apps/backend/dist/  # Debug: check if build succeeded

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/libs ./libs

EXPOSE 3001

# Run the application
CMD ["node", "dist/apps/backend/src/server.js"]