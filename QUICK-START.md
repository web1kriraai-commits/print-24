# Quick Start Guide

## ✅ Setup Complete!

Your client has been built and startup scripts are ready.

## 🚀 How to Run

### Option 1: Production Mode (SSR Enabled)
Run the server which serves the built client with SSR:

```bash
start-server.bat
```

This will:
- Start the Express server on port **5000**
- Serve the built React app with Server-Side Rendering
- Access at: **http://localhost:5000**

### Option 2: Development Mode (Hot Reload)
For development with hot reload, use two terminals:

**Terminal 1 - Client (Vite Dev Server):**
```bash
start-client-dev.bat
```
Runs on: **http://localhost:3000**

**Terminal 2 - Server (API + SSR):**
```bash
start-server.bat
```
Runs on: **http://localhost:5000**

### Option 3: Rebuild Client
If you make changes to the client code, rebuild it:

```bash
build-client.bat
```

Then restart the server.

## 📋 Prerequisites

1. ✅ Dependencies installed (already done)
2. ✅ Client built (already done - `client/dist` folder exists)
3. ⚠️ Server `.env` file configured (check `server/.env`)

## 🔧 Server Configuration

Make sure `server/.env` contains:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_jwt_secret
```

## 🎯 What's Running Where

- **Client Dev Server**: http://localhost:3000 (Vite HMR)
- **Production Server**: http://localhost:5000 (Express + SSR)
- **API Endpoints**: http://localhost:5000/api/*

## 📝 Notes

- The server requires MongoDB connection to start
- If MongoDB connection fails, check your `.env` file
- Client dev server proxies API calls to the server
- Production mode uses SSR for better SEO and performance

