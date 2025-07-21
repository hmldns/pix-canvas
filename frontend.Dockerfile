# Frontend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json files and lockfile
COPY package.json ./
COPY package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY libs/common-types/package.json ./libs/common-types/
COPY libs/utils/package.json ./libs/utils/

# Install dependencies
RUN npm ci

# Copy source code
COPY apps/frontend ./apps/frontend
COPY libs ./libs
COPY tsconfig.json ./

# Build the application
RUN npm run build --workspace=apps/frontend

# Production stage - lightweight static file server
FROM node:18-alpine AS production

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built application
COPY --from=builder /app/apps/frontend/dist ./dist

# Copy the entrypoint script and make it executable
COPY frontend-entrypoint.sh .
RUN chmod +x frontend-entrypoint.sh

ENTRYPOINT ["/app/frontend-entrypoint.sh"]

EXPOSE 3000

# The CMD will be executed by the entrypoint script
CMD ["serve", "-s", "dist", "-l", "3000"]