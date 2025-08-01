# Makefile for Go application with React frontend

# Set the Go binary and flags
GO = go
GOFLAGS = -v

# Set the paths
BUILD_DIR = build
CONFIG_DIR = $(PWD)/../production/config
WEB_DIR = web

# Set the binary name
BINARY_NAME = eltako-to-mqtt-gw
DOCKER_IMAGE_NAME = pharndt/eltako:latest

.PHONY: build
build: build-frontend build-backend

.PHONY: build-frontend
build-frontend:
	@echo "Building the frontend..."
	@cd $(WEB_DIR) && pnpm install && pnpm run build

.PHONY: build-backend
build-backend:
	@echo "Building the backend..."
	@$(GO) build $(GOFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) .

.PHONY: dev-frontend
dev-frontend:
	@echo "Starting frontend dev server..."
	@cd $(WEB_DIR) && pnpm run dev

.PHONY: dev-backend
dev-backend: build-backend
	@echo "Starting backend dev server..."
	@$(BUILD_DIR)/$(BINARY_NAME) $(CONFIG_DIR)/config.json

.PHONY: run
run: build
	@echo "Running the application..."
	@$(BUILD_DIR)/$(BINARY_NAME) $(CONFIG_DIR)/config.json

.PHONY: docker
docker: build
	@echo "Building Docker image..."
	@docker build -t $(DOCKER_IMAGE_NAME) .

.PHONY: clean
clean:
	@echo "Cleaning up..."
	@rm -rf $(BUILD_DIR)
	@cd $(WEB_DIR) && rm -rf dist node_modules
