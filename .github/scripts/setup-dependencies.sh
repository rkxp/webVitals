#!/bin/bash

# Setup Dependencies for Web Vitals Monitoring
# This script ensures all required dependencies are installed

set -e

echo "🔧 Setting up dependencies for Web Vitals monitoring..."

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

# Install project dependencies
echo "📦 Installing project dependencies..."
if [ -f "package-lock.json" ]; then
    echo "Found package-lock.json, using npm ci..."
    npm ci 2>/dev/null || {
        echo "⚠️ npm ci failed, falling back to npm install..."
        npm install
    }
else
    echo "No package-lock.json found, using npm install..."
    npm install
fi

# Install monitoring-specific dependencies if not already installed
echo "🔍 Installing monitoring dependencies..."

# Check if lighthouse is installed
if ! npm list lighthouse >/dev/null 2>&1; then
    echo "Installing lighthouse..."
    npm install --no-save lighthouse@^11.0.0
fi

# Check if @lhci/cli is installed
if ! npm list @lhci/cli >/dev/null 2>&1; then
    echo "Installing @lhci/cli..."
    npm install --no-save @lhci/cli@^0.12.0
fi

# Check if puppeteer is installed
if ! npm list puppeteer >/dev/null 2>&1; then
    echo "Installing puppeteer..."
    npm install --no-save puppeteer@^21.0.0
fi

# Verify installations
echo "✅ Verifying installations..."

# Check if lighthouse command is available
if ! npx lighthouse --version >/dev/null 2>&1; then
    echo "❌ Lighthouse installation failed"
    exit 1
fi

# Check if lhci command is available
if ! npx lhci --version >/dev/null 2>&1; then
    echo "❌ Lighthouse CI installation failed"
    exit 1
fi

echo "🎉 All dependencies installed successfully!"
echo "📊 Ready to run Web Vitals monitoring!"

# Print versions for debugging
echo ""
echo "📋 Installed versions:"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Lighthouse: $(npx lighthouse --version)"
echo "Lighthouse CI: $(npx lhci --version)"