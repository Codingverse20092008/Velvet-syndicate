@echo off
setlocal

echo 🚀 Starting Velvet Backend Setup

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Push schema to database
echo 🗄️  Pushing schema to Turso...
npx drizzle-kit push:sqlite

REM Generate migration
echo 📝 Generating migration...
npx drizzle-kit generate

echo ✅ Setup complete!
echo.
echo Available scripts:
echo   npm run dev          - Start development server
echo   npm run build        - Build for production
echo   npm run start        - Start production server
echo   npm run db:push      - Push schema to database
echo   npm run db:generate  - Generate migrations
echo   npm run db:studio    - Open Drizzle Studio

endlocal