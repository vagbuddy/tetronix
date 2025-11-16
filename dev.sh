#!/bin/bash
# Development startup script - runs both API and frontend

echo "Starting Tetronix development environment..."

# Set service account path for API
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/service-account.json"

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\nStopping servers..."
    kill $API_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# Start API in background
echo "Starting API server on port 3001..."
(cd api && npm run dev) &
API_PID=$!

# Wait for API to start
sleep 3

# Start frontend in foreground
echo "Starting frontend dev server on port 3000..."
echo "Press Ctrl+C to stop both servers"
echo ""

npm run dev

# Cleanup when frontend exits
cleanup
