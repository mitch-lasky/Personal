#!/bin/bash

echo "======================================"
echo "Mitch Lasky Website - Quick Start"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Create necessary directories
mkdir -p data public/media public/images

echo "======================================"
echo "Starting the server..."
echo "======================================"
echo ""
echo "Server will be available at:"
echo "  Main site: http://localhost:3000"
echo "  Admin:     http://localhost:3000/admin/login.html"
echo ""
echo "Default login credentials:"
echo "  Username: admin"
echo "  Password: changeme"
echo ""
echo "Press Ctrl+C to stop the server"
echo "======================================"
echo ""

# Start the server
node server.js
