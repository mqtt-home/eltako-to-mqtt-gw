# syntax=docker/dockerfile:1.17

# Build stage for frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/web

# Copy package files
COPY web/package.json web/pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source files and build
COPY web/ .
RUN pnpm run build

# Build stage for backend
FROM golang:1.23.2-alpine AS backend-builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o eltako-to-mqtt-gw .

# Final stage
FROM gcr.io/distroless/static:nonroot

WORKDIR /

# Copy the binary from builder stage
COPY --from=backend-builder /app/eltako-to-mqtt-gw /eltako-to-mqtt-gw

# Copy the frontend build from frontend-builder stage
COPY --from=frontend-builder /app/web/dist /web/dist

# Create a non-root user (distroless already provides this)
USER nonroot:nonroot

ENTRYPOINT ["/eltako-to-mqtt-gw", "/var/lib/eltako-to-mqtt-gw/config.json"]