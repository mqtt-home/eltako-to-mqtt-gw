#!/bin/bash

# Start both frontend and backend in development mode

echo "Starting Eltako Control Panel in development mode..."

# Function to cleanup background processes
cleanup() {
    echo "Stopping servers..."
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
    exit
}

# Setup trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Start backend
echo "Starting backend server..."
cd "$(dirname "$0")"
make build-backend
./build/eltako-to-mqtt-gw ../production/config/config.json &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend dev server
echo "Starting frontend dev server..."
cd web
pnpm run dev &
FRONTEND_PID=$!

# Wait for both processes
echo "Both servers started!"
echo "Backend API: http://localhost:8080/api"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both servers"

wait
