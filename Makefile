# Infinite Pixel Canvas - Development Makefile
.PHONY: help install up down build rebuild logs clean

# Default target
help: ## Show this help message
	@echo "🎨 Infinite Pixel Canvas - Development Commands"
	@echo ""
	@echo "🐳 Docker Environment Commands:"
	@echo "  up             - Start development environment"
	@echo "  down           - Stop all services"
	@echo "  build          - Build all services"
	@echo "  rebuild        - Force rebuild without cache"
	@echo "  logs           - Show logs from all services"
	@echo "  clean          - Clean up containers and volumes"
	@echo ""
	@echo "⚙️  Setup Commands:"
	@echo "  install        - Install all dependencies"

# Setup Commands
install: ## Install all dependencies for the monorepo
	@echo "📦 Installing dependencies..."
	npm install

# Docker Environment Commands
up: ## Start development environment with Docker
	@echo "🚀 Starting..."
	docker compose up -d


down: ## Stop all services
	@echo "⏹️  Stopping all services..."
	docker compose down

# Docker Build Commands
build: ## Build all services for development
	@echo "🔨 Building all services..."
	docker compose build

rebuild: ## Force rebuild all services without cache
	@echo "🔨 Force rebuilding all services..."
	docker compose build --no-cache

# Monitoring Commands
logs: ## Show logs from all services
	docker compose logs -f

clean: ## Clean up Docker containers, networks, and volumes
	@echo "🧹 Cleaning up Docker resources..."
	docker compose down -v --remove-orphans
	docker system prune -f
