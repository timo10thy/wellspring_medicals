#!/bin/bash

echo "🧪 Testing Pharma Inventory System Setup..."

# Test 1: Check if all required files exist
echo "📁 Checking files..."
files_to_check=(
    "docker-compose.yml"
    "backend/Dockerfile"
    "backend/requirements.txt"
    "backend/app/main.py"
    "frontend/package.json"
    "frontend/Dockerfile"
    "frontend/src/index.js"
    "frontend/src/index.html"
    "frontend/src/input.css"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

# Test 2: Check if ports are available
echo ""
echo "🔌 Checking port availability..."
ports=(3001 8002 3316 8081)
for port in "${ports[@]}"; do
    if lsof -i :$port >/dev/null 2>&1; then
        echo "⚠️  Port $port is in use"
    else
        echo "✅ Port $port is available"
    fi
done

# Test 3: Validate JSON files
echo ""
echo "📄 Validating JSON files..."
if python3 -m json.tool frontend/package.json > /dev/null 2>&1; then
    echo "✅ package.json is valid"
else
    echo "❌ package.json has syntax errors"
fi

# Test 4: Check Docker Compose syntax
echo ""
echo "🐳 Validating docker-compose.yml..."
if docker-compose config > /dev/null 2>&1; then
    echo "✅ docker-compose.yml is valid"
else
    echo "❌ docker-compose.yml has syntax errors"
fi

echo ""
echo "🚀 Ready to run: docker-compose up --build"
