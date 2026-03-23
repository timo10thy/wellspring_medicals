#!/bin/bash

echo "🚀 Starting Pharma Inventory System..."

# Start backend in background
echo "📦 Starting backend on port 8002..."
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "🌐 Starting frontend on port 3001..."
cd ../frontend
npm run build && cp src/index.html dist/ && npx http-server dist -p 3001 &
FRONTEND_PID=$!

echo "✅ Backend running on http://localhost:8002"
echo "✅ Frontend running on http://localhost:3001"
echo "✅ API Docs available at http://localhost:8002/docs"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for interrupt
wait

# Cleanup on exit
echo "🛑 Stopping services..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
echo "✅ All services stopped"
