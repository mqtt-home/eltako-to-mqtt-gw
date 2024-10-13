# Makefile for Go application

# Set the Go binary and flags
GO = go
GOFLAGS = -v

# Set the paths
BUILD_DIR = build
CONFIG_DIR = $(PWD)/../production/config

# Set the binary name
BINARY_NAME = eltako-to-mqtt-gw
DOCKER_IMAGE_NAME = pharndt/eltako:latest

.PHONY: build
build:
	@echo "Building the application..."
	@$(GO) build $(GOFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) .

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
