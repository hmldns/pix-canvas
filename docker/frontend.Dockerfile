# Frontend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json files
COPY package.json ./
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
RUN npm run build:frontend

# Production stage - serve with nginx
FROM nginx:alpine AS production

# Copy built application
COPY --from=builder /app/dist/apps/frontend /usr/share/nginx/html

# Copy nginx config
COPY --from=builder /app/apps/frontend/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

# Run nginx
CMD ["nginx", "-g", "daemon off;"]