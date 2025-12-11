@echo off
echo ========================================
echo Starting Prints24 Server
echo ========================================
cd server
echo.
echo Checking for .env file...
if not exist .env (
    echo ERROR: .env file not found in server folder!
    echo Please create server/.env with required environment variables.
    echo See SETUP.md for details.
    pause
    exit /b 1
)
echo .env file found ✓
echo.
echo Starting server on port 5000...
echo Access the app at: http://localhost:5000
echo.
npm start

