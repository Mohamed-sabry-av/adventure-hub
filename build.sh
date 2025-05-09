#!/bin/bash

# Build script for Adventures HUB with optimized settings
# This script produces a highly optimized SSR build

echo "🚀 Starting optimized build process for Adventures HUB..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/

# Install dependencies if needed
if [ "$1" == "--install" ]; then
  echo "📦 Installing dependencies..."
  npm ci
fi

# Optimize images
echo "🖼️ Optimizing images..."
if command -v npx &> /dev/null; then
  npx @squoosh/cli --mozjpeg auto ./src/assets/**/*.jpg
  npx @squoosh/cli --webp auto ./src/assets/**/*.jpg
fi

# Build with production settings
echo "🏗️ Building production bundle..."
npm run build:optimize

# Create SSR bundle
echo "🌐 Building SSR bundle..."
npm run build:ssr

# Analyze bundle if requested
if [ "$1" == "--analyze" ] || [ "$2" == "--analyze" ]; then
  echo "📊 Analyzing bundle size..."
  npm run build:analyze
fi

echo "✅ Build complete! The optimized application is ready in dist/"
echo "To start the SSR server, run: npm run serve:ssr:advhub" 