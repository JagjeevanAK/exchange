.PHONY: help build up down logs clean restart migrate

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

logs: ## View logs from all services
	docker-compose logs -f

clean: ## Stop services and remove volumes (WARNING: deletes data)
	docker-compose down -v
	docker system prune -f

restart: down up ## Restart all services

migrate: ## Run database migrations
	docker-compose exec server bunx prisma migrate dev

seed: ## Seed the database
	docker-compose exec server bunx prisma db seed

reset-db: ## Reset database (WARNING: deletes all data)
	docker-compose exec server bunx prisma migrate reset

status: ## Show service status
	docker-compose ps

shell-server: ## Open shell in server container
	docker-compose exec server sh

shell-poller: ## Open shell in poller container
	docker-compose exec poller sh

shell-ws: ## Open shell in ws-gateway container
	docker-compose exec ws-gateway sh

shell-db: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U postgres -d exchange

shell-redis: ## Open Redis CLI
	docker-compose exec redis redis-cli

dev: ## Start services in development mode with logs
	docker-compose up

prod: ## Start services in production mode
	docker-compose -f docker-compose.yml up -d
