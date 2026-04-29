#!/bin/bash

# Frontend Deployment Script
# Deploys the fixed frontend to Vercel

echo "🚀 DEPLOYING FIXED FRONTEND TO VERCEL"
echo "======================================"

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found"
    echo "Please run this script from the Velvet root directory"
    exit 1
fi

# Navigate to frontend directory
cd frontend

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📥 Installing Vercel CLI..."
    npm i -g vercel
fi

echo "🚀 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "✅ Frontend deployed successfully!"
    echo ""
    echo "🌐 Your frontend is now live at: https://velvet-syndicate-frontend.vercel.app"
    echo ""
    echo "🧪 To test the deployment, run:"
    echo "cd backend && node test-fixed-frontend.js"
    echo ""
    echo "🎉 The Velvet Syndicate e-commerce system is now fully operational!"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
