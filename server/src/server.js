import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join, resolve } from "path";
import { readFileSync, readdirSync, accessSync, existsSync } from "fs";
import { createRequire } from "module";
import authRoutes from "./routes/authRoutes.js";
import apiRoutes from "./routes/index.js";
import uploadRoutes from "./routes/uploadRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up module resolution for SSR to find React from client's node_modules
const clientNodeModules = join(__dirname, "../../client/node_modules");
const require = createRequire(import.meta.url);

// Add client's node_modules to module resolution path
if (existsSync(clientNodeModules)) {
  // This helps resolve React when SSR module is imported
  process.env.NODE_PATH = process.env.NODE_PATH 
    ? `${process.env.NODE_PATH}:${clientNodeModules}`
    : clientNodeModules;
}

// Load .env file from server folder (one level up from src)
dotenv.config({ path: join(__dirname, "../.env") });

const app = express();

// Trust proxy for reverse proxy setups
app.set("trust proxy", true);

// CORS - Allow all origins for development
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
      if (!origin) return callback(null, true);
      
      // List of allowed origins
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
      ];
      
      // Allow if origin is in the list or if it's a localhost/127.0.0.1 origin
      if (allowedOrigins.includes(origin) || 
          origin.startsWith("http://localhost:") || 
          origin.startsWith("http://127.0.0.1:")) {
        callback(null, true);
      } else {
        // For development, allow all origins
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Headers",
      "Access-Control-Allow-Methods"
    ],
    exposedHeaders: [
      "Content-Type",
      "Authorization"
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// Increase body parser limit to handle large base64 image data (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API ROUTES (must come before SSR routes)
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/api", uploadRoutes);

// Serve static files from client dist
// From server/src/server.js, go up 2 levels to print24-ssr, then into client/dist
const clientDistPath = join(__dirname, "../../client/dist");
const clientDistPathResolved = resolve(clientDistPath);
console.log(`[SSR] Client dist path: ${clientDistPathResolved}`);

// Verify dist folder exists
if (!existsSync(clientDistPath)) {
  console.error(`[SSR] ERROR: Client dist folder does not exist at: ${clientDistPathResolved}`);
  console.error(`[SSR] Please run 'npm run build' in the client folder first!`);
  console.error(`[SSR] Command: cd ../client && npm run build`);
  process.exit(1);
} else {
  console.log(`[SSR] ✅ Client dist folder found at: ${clientDistPathResolved}`);
  
    // Verify index.html exists in dist
    const distIndexPath = join(clientDistPath, "index.html");
    if (!existsSync(distIndexPath)) {
      console.error(`[SSR] ERROR: index.html not found in dist folder at: ${distIndexPath}`);
      console.error(`[SSR] Please run 'npm run build' in the client folder first!`);
      console.error(`[SSR] Command: cd ../client && npm run build`);
      process.exit(1);
  } else {
    // Quick check: read a sample to verify it's the production build
    const sample = readFileSync(distIndexPath, "utf-8").substring(0, 500);
    if (sample.includes("@react-refresh") || sample.includes("@vite/client") || sample.includes("index.tsx")) {
      console.error(`[SSR] ❌ ERROR: dist/index.html contains dev scripts!`);
      console.error(`[SSR] This means the build is incorrect. Please rebuild with 'npm run build'`);
      console.error(`[SSR] Sample: ${sample}`);
      process.exit(1);
    } else {
      console.log(`[SSR] ✅ dist/index.html is clean (production build)`);
    }
  }
}

// Serve static files FIRST (before SSR) - images, CSS, JS, etc.
// IMPORTANT: Only serve from dist folder, NOT from source
app.use("/assets", express.static(join(clientDistPath, "assets")));
app.use("/client.js", express.static(join(clientDistPath, "client.js")));

// Handle /index.css requests (return 404 since it doesn't exist)
app.get("/index.css", (req, res) => {
  res.status(404).setHeader('Content-Type', 'text/css').send("/* index.css not found */");
});

// Also serve from public folder for images (logo.svg, etc.)
// Files in public/ are served at root path (e.g., /logo.svg, not /public/logo.svg)
const clientPublicPath = join(__dirname, "../../client/public");
if (existsSync(clientPublicPath)) {
  app.use(express.static(clientPublicPath, { 
    index: false,
    dotfiles: 'ignore',
  }));
  console.log(`[Server] ✅ Serving static files from: ${clientPublicPath}`);
  
  // Handle /public/* requests and serve from public folder (for browser compatibility)
  // Use middleware approach instead of route pattern to handle all /public/* requests
  app.use("/public", (req, res, next) => {
    const filePath = req.path; // This will be like "/logo.svg" when request is "/public/logo.svg"
    const fullPath = join(clientPublicPath, filePath);
    if (existsSync(fullPath)) {
      res.sendFile(fullPath);
    } else {
      next();
    }
  });
}

// Serve all other static files (images, fonts, etc.) from dist folder ONLY
// This must NOT serve index.html - SSR will handle that
// IMPORTANT: This must come AFTER SSR middleware registration but BEFORE SSR handler execution
// We'll register it after SSR handler to ensure SSR runs first

// Load SSR build (simple approach like the sample)
let ssrRender = null;
let ssrModuleLoaded = false;
const ssrPath = join(clientDistPath, "ssr.js");

// Load SSR module synchronously before starting server
async function loadSSRModule() {
  if (!existsSync(ssrPath)) {
    console.warn(`[SSR] ⚠️ SSR file not found at: ${ssrPath}`);
    console.warn(`[SSR] Please run 'npm run build' in the client folder first!`);
    console.warn(`[SSR] Command: cd ../client && npm run build`);
    return false;
  }

  try {
    console.log("[SSR] Loading SSR module...");
    // Use file:// URL for proper module resolution
    const ssrUrl = pathToFileURL(ssrPath).href;
    console.log("[SSR] SSR module path:", ssrUrl);
    const m = await import(ssrUrl);
    // Try multiple export patterns: named export, default export (function), or default.render
    ssrRender = m.render || (typeof m.default === 'function' ? m.default : m.default?.render) || null;
    console.log("[SSR] ✅ SSR module loaded");
    console.log("[SSR] Module exports:", Object.keys(m));
    if (ssrRender && typeof ssrRender === 'function') {
      console.log("[SSR] ✅ Render function available");
      // Test render to verify it works
      try {
        const testHtml = ssrRender('/');
        if (testHtml && testHtml.length > 0) {
          console.log(`[SSR] ✅ Test render successful (${testHtml.length} chars)`);
        } else {
          console.warn(`[SSR] ⚠️ Test render returned empty string`);
        }
      } catch (testError) {
        console.error(`[SSR] ❌ Test render failed:`, testError.message);
      }
      ssrModuleLoaded = true;
      return true;
    } else {
      console.warn("[SSR] ⚠️ Render function not found in module");
      console.warn("[SSR] Available exports:", Object.keys(m));
      if (m.default !== undefined) {
        console.warn("[SSR] Default export type:", typeof m.default);
        if (typeof m.default === 'object' && m.default !== null) {
          console.warn("[SSR] Default export keys:", Object.keys(m.default));
        }
      }
      return false;
    }
  } catch (err) {
    console.error("[SSR] ❌ Failed to load SSR module:", err.message);
    console.error("[SSR] Error stack:", err.stack);
    return false;
  }
}

// SSR handler - simple catch-all like the sample
// Use app.use() instead of app.get("*") for Express 5.x compatibility
app.use(async (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith("/api")) {
    return next();
  }
  
  // Skip static assets (already served above)
  if (req.path.startsWith("/assets") || 
      req.path === "/client.js" ||
      /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(req.path)) {
    return next();
  }
  
  // Skip well-known paths (Chrome DevTools, service workers, etc.)
  if (req.path.startsWith("/.well-known") ||
      req.path.startsWith("/favicon.ico") ||
      req.path.startsWith("/robots.txt") ||
      req.path.startsWith("/sitemap.xml")) {
    return res.status(404).end();
  }
  
  // Only handle GET requests
  if (req.method !== "GET") {
    return next();
  }

  try {
    // Read HTML template from dist folder
    const templatePath = join(clientDistPath, "index.html");
    let template = readFileSync(templatePath, "utf-8");
    
    // Verify template has the placeholder (for debugging)
    if (!template.includes('<!--app-html-->') && !template.includes('<div id="root">')) {
      console.warn(`[SSR] ⚠️ Template may not have placeholder. Path: ${templatePath}`);
    }
    
    // Clean up Vite build artifacts (modulepreload, asset scripts)
    template = template.replace(/<link[^>]*rel\s*=\s*["']modulepreload["'][^>]*>/gi, '');
    template = template.replace(/<script[^>]*src\s*=\s*["']\/assets\/[^"']*\.js["'][^>]*>[\s\S]*?<\/script>/gi, '');
    template = template.replace(/<script[^>]*src\s*=\s*["']\/assets\/[^"']*\.js["'][^>]*\/>/gi, '');
    
    // CRITICAL: Clean up React Router resource hints (preload links) from rendered HTML
    // These should not be in the root div - they get injected by React Router
    // We'll remove them from the appHtml before injecting
    
    // Ensure client.js is present (remove any existing first to avoid duplicates)
    template = template.replace(/<script[^>]*src\s*=\s*["']\/client\.js["'][^>]*>[\s\S]*?<\/script>/gi, '');
    template = template.replace(/<script[^>]*src\s*=\s*["']\/client\.js["'][^>]*\/>/gi, '');
    if (!template.includes('src="/client.js"') && !template.includes("src='/client.js'")) {
      template = template.replace('</body>', '<script type="module" src="/client.js"></script></body>');
    }
    
    // Render React app
    let appHtml = "";
    if (ssrRender && typeof ssrRender === 'function') {
      try {
        appHtml = ssrRender(req.url);
        if (appHtml && appHtml.length > 0) {
          console.log(`[SSR] ✅ Rendered ${appHtml.length} chars for: ${req.url}`);
          
          // CRITICAL: Clean up React Router resource hints (preload links) from rendered HTML
          // React Router injects <link rel="preload"> tags which should not be in the root div
          // Remove all preload links that React Router might inject
          appHtml = appHtml.replace(/<link[^>]*rel\s*=\s*["']preload["'][^>]*>/gi, '');
          appHtml = appHtml.replace(/<link[^>]*rel\s*=\s*["']modulepreload["'][^>]*>/gi, '');
          appHtml = appHtml.replace(/<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi, '');
          
          // Also remove any other link tags that shouldn't be in body
          appHtml = appHtml.replace(/<link[^>]*>/gi, '');
          
          console.log(`[SSR] ✅ Cleaned appHtml, new length: ${appHtml.length} chars`);
        } else {
          console.warn(`[SSR] ⚠️ Render returned empty string for: ${req.url}`);
          appHtml = '<div><h1>Loading...</h1></div>';
        }
      } catch (renderError) {
        console.error(`[SSR] ❌ Render error for ${req.url}:`, renderError.message);
        console.error(`[SSR] Error stack:`, renderError.stack);
        appHtml = '<div><h1>Server Error</h1><p>Please refresh the page.</p></div>';
      }
    } else {
      console.warn(`[SSR] ⚠️ Render function not available for: ${req.url}`);
      if (!ssrModuleLoaded) {
        console.warn(`[SSR] ⚠️ SSR module not loaded yet, serving empty content`);
      }
      appHtml = '<div><h1>Loading...</h1></div>';
    }
    
    // Replace placeholder with rendered HTML - ensure it's always replaced
    let html = template;
    
    if (appHtml.length > 0) {
      // CRITICAL: Replace the placeholder with actual rendered HTML
      // The placeholder is: <!--app-html-->
      // It should be inside: <div id="root"><!--app-html--></div>
      
      // Method 1: Direct placeholder replacement (most reliable)
      if (template.includes('<!--app-html-->')) {
        // Replace the placeholder with the rendered HTML
        html = template.replace('<!--app-html-->', appHtml);
        console.log(`[SSR] ✅ Replaced <!--app-html--> placeholder for: ${req.url}`);
      } 
      // Method 2: Replace empty root div
      else if (template.includes('<div id="root"></div>')) {
        html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
        console.log(`[SSR] ✅ Replaced empty <div id="root"> for: ${req.url}`);
      }
      // Method 3: Replace root div with any content (including placeholder)
      else if (template.includes('<div id="root">')) {
        // Use regex to replace everything between <div id="root"> and </div>
        // This handles cases where there might be whitespace or other content
        html = template.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${appHtml}</div>`);
        console.log(`[SSR] ✅ Replaced <div id="root"> content for: ${req.url}`);
      }
      // Method 4: Insert before closing body tag as last resort
      else {
        html = template.replace('</body>', `${appHtml}</body>`);
        console.log(`[SSR] ✅ Inserted HTML before </body> for: ${req.url}`);
      }
      
      // CRITICAL: Verify replacement worked - if placeholder still exists, force replace
      if (html.includes('<!--app-html-->')) {
        console.error(`[SSR] ❌ ERROR: Placeholder still exists after replacement for: ${req.url}`);
        // Force replace using all possible methods
        html = html.replace(/<!--app-html-->/g, appHtml);
        html = html.replace(/<div id="root">\s*<\/div>/g, `<div id="root">${appHtml}</div>`);
        html = html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${appHtml}</div>`);
        console.log(`[SSR] 🔧 Force replaced placeholder using all methods`);
      }
      
      // Final verification - check if root div has content
      const rootDivMatch = html.match(/<div id="root">([\s\S]*?)<\/div>/);
      if (rootDivMatch) {
        const rootContent = rootDivMatch[1];
        if (rootContent.trim().length === 0 || rootContent.includes('<!--app-html-->')) {
          console.error(`[SSR] ❌ CRITICAL: Root div is still empty or has placeholder!`);
          // Last resort: direct replacement
          html = html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${appHtml}</div>`);
        } else {
          const preview = rootContent.length > 300 ? rootContent.substring(0, 300) + '...' : rootContent;
          console.log(`[SSR] 📄 Root div content (${rootContent.length} chars):`, preview.substring(0, 200));
        }
      }
    } else {
      console.warn(`[SSR] ⚠️ No HTML to inject for: ${req.url} (appHtml length: ${appHtml.length})`);
    }
    
    // CRITICAL: Verify the HTML actually contains the rendered content
    // Check if root div has meaningful content (not just placeholder or empty)
    const hasRenderedContent = html.includes('<div id="root">') && 
                               !html.includes('<!--app-html-->') &&
                               html.indexOf('<div id="root">') < html.indexOf('</div>');
    
    if (!hasRenderedContent && appHtml.length > 0) {
      console.error(`[SSR] ❌ CRITICAL: HTML does not contain rendered content!`);
      console.error(`[SSR] Template has placeholder: ${template.includes('<!--app-html-->')}`);
      console.error(`[SSR] Final HTML has placeholder: ${html.includes('<!--app-html-->')}`);
      console.error(`[SSR] AppHtml length: ${appHtml.length}`);
      
      // Emergency fallback: force inject
      const rootDivRegex = /<div id="root">[\s\S]*?<\/div>/;
      if (rootDivRegex.test(html)) {
        html = html.replace(rootDivRegex, `<div id="root">${appHtml}</div>`);
        console.log(`[SSR] 🔧 Emergency: Force injected HTML into root div`);
      }
    }
    
    // Set proper headers to prevent caching and ensure correct content type
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    
    // Send the response
    res.status(200).send(html);
  } catch (err) {
    console.error("[SSR] Error:", err);
    // Fallback: serve template with empty root
    try {
      let template = readFileSync(join(clientDistPath, "index.html"), "utf-8");
      template = template.replace(/<link[^>]*rel\s*=\s*["']modulepreload["'][^>]*>/gi, '');
      template = template.replace(/<script[^>]*src\s*=\s*["']\/assets\/[^"']*\.js["'][^>]*>[\s\S]*?<\/script>/gi, '');
      if (!template.includes('src="/client.js"') && !template.includes("src='/client.js'")) {
        template = template.replace('</body>', '<script type="module" src="/client.js"></script></body>');
      }
      const html = template.replace(/<!--app-html-->/gi, '');
      res.setHeader("Content-Type", "text/html");
      res.end(html);
    } catch {
      res.status(500).send("Server Error");
    }
  }
});

// Static files are already served above, before SSR middleware

// DB + SERVER
if (!process.env.MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI environment variable is not set!");
  console.error("Please check your .env file and ensure MONGO_URI is configured.");
  process.exit(1);
}

// Start server after SSR module and MongoDB are ready
async function startServer() {
  // Load SSR module first
  await loadSSRModule();
  
  // Connect to MongoDB
  mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      retryWrites: true,
      w: 'majority'
    })
    .then(() => {
      console.log("✅ MongoDB connected successfully");
      const port = process.env.PORT || 5000;
      app.listen(port, () => {
        console.log(`========================================`);
        console.log(`🚀 Backend Server running on port ${port}`);
        console.log(`📦 SSR Enabled - Access: http://localhost:${port}`);
        console.log(`⚠️  DO NOT use http://localhost:3000 (Vite dev server)`);
        console.log(`========================================`);
      });
    })
    .catch((err) => {
      console.error("❌ MongoDB connection error:");
      console.error("==========================================");
      
      if (err.message.includes("authentication failed") || err.message.includes("bad auth")) {
      console.error("🔐 Authentication Error:");
      console.error("   - Check your MongoDB username and password");
      console.error("   - Verify your connection string includes correct credentials");
      console.error("   - Make sure special characters in password are URL-encoded");
    } else if (err.message.includes("IP") || err.message.includes("whitelist")) {
      console.error("🌐 IP Whitelist Error:");
      console.error("   - Your IP address is not whitelisted in MongoDB Atlas");
      console.error("   - Go to MongoDB Atlas → Network Access → Add IP Address");
      console.error("   - You can add '0.0.0.0/0' to allow all IPs (for development only)");
    } else if (err.message.includes("ECONNREFUSED") || err.message.includes("connection")) {
      console.error("🔌 Connection Error:");
      console.error("   - Check your internet connection");
      console.error("   - Verify MongoDB Atlas cluster is running");
      console.error("   - Check if firewall is blocking the connection");
    } else if (err.message.includes("ReplicaSetNoPrimary")) {
      console.error("🔄 Replica Set Error:");
      console.error("   - MongoDB cluster may be initializing or unavailable");
      console.error("   - Wait a few minutes and try again");
      console.error("   - Check MongoDB Atlas cluster status");
    }
    
    console.error("\n📋 Connection String Format:");
    console.error("   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority");
    console.error("\n💡 Troubleshooting Steps:");
    console.error("   1. Verify MONGO_URI in your .env file");
    console.error("   2. Check MongoDB Atlas dashboard for cluster status");
    console.error("   3. Ensure your IP is whitelisted in Network Access");
    console.error("   4. Verify database user credentials are correct");
      console.error("==========================================");
      console.error("\nFull error details:", err.message);
      process.exit(1);
    });
}

// Start the server
startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
