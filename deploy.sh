#!/bin/bash

# RoyalRaptorPOS Serverless Deployment Script

echo "🚀 Deploying RoyalRaptorPOS to AWS Lambda..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Using default values."
    echo "   Copy env.example to .env and configure your environment variables."
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

# Deploy to AWS Lambda
echo "☁️  Deploying to AWS Lambda..."
cd server && npm run deploy

echo "✅ Deployment complete!"
echo "🌐 Your API Gateway URL will be displayed above."
echo "📝 Remember to update your client configuration with the new API URL."
