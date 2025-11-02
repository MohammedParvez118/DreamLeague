#!/bin/bash

# Fantasy App Startup Script
# This script starts both the backend and frontend servers

echo "🚀 Starting Fantasy App..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Start backend server in background
echo "📡 Starting Backend API Server (Port 3000)..."
cd "c:/Users/admin/Documents/Fantasy-app - Backup"
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server in background
echo "⚛️  Starting React Frontend Server (Port 5173)..."
cd "c:/Users/admin/Documents/Fantasy-app - Backup/client"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting..."
echo ""
echo "📡 Backend API:  http://localhost:3000"
echo "⚛️  React Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait