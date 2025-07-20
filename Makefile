# Infinite Pixel Canvas - Development Makefile
.PHONY: help build up down test-backend test-backend-watch dev-frontend dev-backend clean install

# Default target
help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Installation and setup
install: ## Install all dependencies for the monorepo
	npm install

# Build targets
build: ## Build all Docker images
	@echo "Building all Docker images..."
	cd docker && docker-compose build

build-backend: ## Build only the backend Docker image
	@echo "Building backend Docker image..."
	cd docker && docker-compose build backend

build-frontend: ## Build only the frontend Docker image
	@echo "Building frontend Docker image..."
	cd docker && docker-compose build frontend

build-signaling: ## Build only the signaling Docker image
	@echo "Building signaling Docker image..."
	cd docker && docker-compose build signaling

# Development targets
up: ## Start all services using docker-compose
	@echo "Starting all services..."
	cd docker && docker compose up -d

down: ## Stop all services
	@echo "Stopping all services..."
	cd docker && docker-compose down

restart: down up ## Restart all services

# Development mode targets
dev-frontend: ## Launch the frontend in local development mode with hot-reloading
	@echo "Starting frontend in development mode..."
	cd apps/frontend && npm run dev

dev-backend: ## Launch the backend in local development mode
	@echo "Starting backend in development mode..."
	cd apps/backend && npm run dev

dev-signaling: ## Launch the signaling service in local development mode
	@echo "Starting signaling service in development mode..."
	cd apps/signaling && npm run dev

# Testing targets
test-backend: ## Run the backend integration test suite
	@echo "Running backend integration tests..."
	cd apps/backend && npm run test

test-backend-watch: ## Run the backend test suite in watch mode
	@echo "Running backend tests in watch mode..."
	cd apps/backend && npm run test:watch

# Utility targets
logs: ## Show logs from all services
	cd docker && docker-compose logs -f

logs-backend: ## Show logs from backend service only
	cd docker && docker-compose logs -f backend

logs-frontend: ## Show logs from frontend service only
	cd docker && docker-compose logs -f frontend

logs-signaling: ## Show logs from signaling service only
	cd docker && docker-compose logs -f signaling

clean: ## Clean up Docker images and containers
	@echo "Cleaning up Docker resources..."
	cd docker && docker-compose down -v --rmi all --remove-orphans
	docker system prune -f

status: ## Show status of all services
	cd docker && docker-compose ps

# Database targets
db-shell: ## Connect to MongoDB shell
	cd docker && docker-compose exec mongodb mongosh pixcanvas

# Lint and format targets
lint: ## Run linting for all projects
	@echo "Running linting..."
	npm run lint --workspaces

format: ## Format code for all projects
	@echo "Formatting code..."
	npm run format --workspaces

# Type checking
typecheck: ## Run TypeScript type checking for all projects
	@echo "Running type checking..."
	npm run typecheck --workspaces