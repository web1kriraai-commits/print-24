import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { routes } from './routes';
// PrimeReact CSS (for SSR compatibility)
import 'primereact/resources/themes/lara-light-amber/theme.css';
import 'primereact/resources/primereact.min.css';
import 'quill/dist/quill.snow.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Create browser router with the same routes as server
const router = createBrowserRouter(routes);

// Check if root has server-rendered content (more reliable check)
const hasServerContent = rootElement.innerHTML.trim().length > 0 && 
                         !rootElement.innerHTML.includes('<!--app-html-->') &&
                         rootElement.children.length > 0;

if (hasServerContent) {
  // Hydrate if server-rendered content exists
  // Don't use StrictMode to match server rendering
  hydrateRoot(
    rootElement,
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
} else {
  // Create new root if no server content (fallback)
  const root = createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

