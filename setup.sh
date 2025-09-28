#!/bin/bash

# Project Management App Deployment Script
# This script sets up the development environment and prepares for deployment

echo "🚀 Setting up Project Management Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install

# Install client dependencies
echo "📦 Installing client dependencies..."
cd ../client
npm install

# Go back to root
cd ..

# Create environment files if they don't exist
echo "⚙️ Setting up environment files..."

if [ ! -f "server/.env" ]; then
    echo "📝 Creating server .env file..."
    cp server/env.example server/.env
    echo "⚠️  Please update server/.env with your database credentials"
fi

if [ ! -f "client/.env.local" ]; then
    echo "📝 Creating client .env.local file..."
    cp client/env.example client/.env.local
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update server/.env with your PostgreSQL database credentials"
echo "2. Make sure PostgreSQL is running"
echo "3. Run 'npm run db:setup' to set up the database"
echo "4. Run 'npm run dev' to start both frontend and backend"
echo ""
echo "🔗 Default login credentials:"
echo "   Admin: admin@example.com / admin123"
echo "   Manager: manager@example.com / manager123"
echo "   Employee: employee@example.com / employee123"
echo ""
echo "🌐 Application will be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo ""
echo "📚 For deployment instructions, see README.md"
