#!/bin/bash

# Function to kill processes
cleanup() {
    echo "Shutting down servers..."
    kill $PID_BACKEND 2>/dev/null
    exit
}

# Trap Ctrl+C (SIGINT)
trap cleanup SIGINT

echo "🧹 Cleaning up old ports (4000 & 5000)..."
lsof -ti:4000 | xargs kill -9 2>/dev/null
lsof -ti:5000 | xargs kill -9 2>/dev/null

echo "🚀 Starting Python Admin Backend (Port 5000)..."
python3 server.py &
PID_BACKEND=$!

# Wait a second for backend to init
sleep 2

echo "🎨 Starting Jekyll Frontend (Port 4000)..."
bundle exec jekyll serve --livereload --port 4000

# When Jekyll exits, cleanup backend
cleanup
