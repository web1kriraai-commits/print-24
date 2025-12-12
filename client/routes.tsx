import React from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import DigitalPrint from './pages/DigitalPrint';
import VisitingCards from './pages/VisitingCards';
import GlossProductSelection from './pages/GlossProductSelection';
import Upload from './pages/Upload';
import About from './pages/About';
import Policy from './pages/Policy';
import Contact from './pages/Contact';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import AdminDashboard from './pages/AdminDashboard';
import Reviews from './pages/Reviews';
import Profile from './pages/Profile';
import OrderDetails from './pages/OrderDetails';
import MyOrders from './pages/MyOrders';
import DepartmentPortal from './pages/DepartmentPortal';
import EmployeeDashboard from './pages/EmployeeDashboard';

// Shared routes configuration for both SSR and client
export const routes = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Home />, errorElement: <ErrorBoundary /> },
      { path: 'digital-print', element: <DigitalPrint />, errorElement: <ErrorBoundary /> },
      { path: 'digital-print/:categoryId', element: <VisitingCards />, errorElement: <ErrorBoundary /> },
      { path: 'digital-print/:categoryId/gloss-finish', element: <GlossProductSelection />, errorElement: <ErrorBoundary /> },
      // Subcategory products list - must come before product detail routes
      // Note: VisitingCards will redirect "Gloss Finish" subcategory to GlossProductSelection
      { path: 'digital-print/:categoryId/:subCategoryId', element: <VisitingCards />, errorElement: <ErrorBoundary /> },
      // Product detail routes - using GlossProductSelection for all products
      { path: 'digital-print/:categoryId/:subCategoryId/:productId', element: <GlossProductSelection />, errorElement: <ErrorBoundary /> },
      { path: 'digital-print/:categoryId/:productId', element: <GlossProductSelection />, errorElement: <ErrorBoundary /> },
      { path: 'upload', element: <Upload />, errorElement: <ErrorBoundary /> },
      { path: 'about', element: <About />, errorElement: <ErrorBoundary /> },
      { path: 'policy', element: <Policy />, errorElement: <ErrorBoundary /> },
      { path: 'contact', element: <Contact />, errorElement: <ErrorBoundary /> },
      { path: 'login', element: <Login />, errorElement: <ErrorBoundary /> },
      { path: 'signup', element: <SignUp />, errorElement: <ErrorBoundary /> },
      { path: 'profile', element: <Profile />, errorElement: <ErrorBoundary /> },
      { path: 'my-orders', element: <MyOrders />, errorElement: <ErrorBoundary /> },
      { path: 'orders/:orderId', element: <OrderDetails />, errorElement: <ErrorBoundary /> },
      { path: 'order/:orderId', element: <OrderDetails />, errorElement: <ErrorBoundary /> },
      { path: 'admin/dashboard', element: <AdminDashboard />, errorElement: <ErrorBoundary /> },
      { path: 'employee/dashboard', element: <EmployeeDashboard />, errorElement: <ErrorBoundary /> },
      { path: 'department-portal', element: <DepartmentPortal />, errorElement: <ErrorBoundary /> },
      { path: 'reviews', element: <Reviews />, errorElement: <ErrorBoundary /> },
    ],
  },
];

