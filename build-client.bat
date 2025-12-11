@echo off
echo ========================================
echo Building Prints24 Client
echo ========================================
cd client
echo.
echo Building client for production...
npm run build
echo.
if %ERRORLEVEL% EQU 0 (
    echo ✅ Build successful!
    echo The dist folder has been created.
) else (
    echo ❌ Build failed!
    pause
    exit /b 1
)

