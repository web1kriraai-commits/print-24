import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { AnimatePresence } from 'framer-motion';

// Client-only Toaster component to avoid SSR hook errors
const ClientOnlyToaster: React.FC = () => {
  const [Toaster, setToaster] = React.useState<React.ComponentType<any> | null>(null);

  React.useEffect(() => {
    // Only import and render Toaster on client
    if (typeof window !== 'undefined') {
      import('react-hot-toast').then((mod) => {
        setToaster(() => mod.Toaster);
      });
    }
  }, []);

  if (!Toaster) return null;

  return (
    <Toaster 
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  );
};

const Layout: React.FC = () => {
  const location = useLocation();

  // Scroll to top on route change (client-side only)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  // Client-only flag to avoid hydration mismatch
  // CRITICAL: Server and client must render IDENTICAL structure initially
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    // Only enable animations after hydration is complete
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100); // Small delay to ensure hydration completes
    return () => clearTimeout(timer);
  }, []);

  // CRITICAL: Always render the EXACT same structure on server and client
  // Both render: <div key={path}><div><Outlet /></div></div>
  // The structure must be identical - no conditional wrappers that change DOM
  return (
    <div className="min-h-screen flex flex-col font-sans text-cream-900 bg-cream-50">
      <Navbar />
      <main className="flex-grow pt-16">
        {/* CRITICAL: Always render same structure - server and client must match exactly */}
        {/* This structure is identical on both server and client */}
        <div key={location.pathname}>
          <div>
            <Outlet />
          </div>
        </div>
      </main>
      <Footer />
      {/* Render Toaster only on client to avoid SSR hook errors */}
      <ClientOnlyToaster />
    </div>
  );
};

export default Layout;
