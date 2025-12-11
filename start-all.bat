@echo off
echo ========================================
echo Starting Prints24 Application
echo ========================================
echo.
echo This will:
echo 1. Build the client (if needed)
echo 2. Start the server
echo.
echo For development with hot reload:
echo - Run start-client-dev.bat in one terminal
echo - Run start-server.bat in another terminal
echo.
pause
echo.
echo Building client...
call build-client.bat
echo.
echo Starting server...
call start-server.bat

