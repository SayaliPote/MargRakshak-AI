import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import UserLayout from './components/layout/UserLayout';

// Route Guards
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import ProtectedUserRoute from './components/ProtectedUserRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMap from './pages/admin/AdminMap';
import AdminAnalysis from './pages/admin/AdminAnalysis';
import AdminHotspots from './pages/admin/AdminHotspots';
import AdminReports from './pages/admin/AdminReports';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProfile from './pages/admin/AdminProfile';

// User Pages
import UserNavigation from './pages/user/UserNavigation';
import UserAlerts from './pages/user/UserAlerts';
import UserRoutes from './pages/user/UserRoutes';
import UserProfile from './pages/user/UserProfile';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Entry / Role-specific Authentication */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/user/login" element={<Navigate to="/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />

        {/* Admin Dashboard Experience (Protected) */}
        <Route 
          path="/admin" 
          element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </ProtectedAdminRoute>
          } 
        />
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </ProtectedAdminRoute>
          } 
        />
        <Route 
          path="/admin/map" 
          element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AdminMap />
              </AdminLayout>
            </ProtectedAdminRoute>
          } 
        />
        <Route 
          path="/admin/analysis" 
          element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AdminAnalysis />
              </AdminLayout>
            </ProtectedAdminRoute>
          } 
        />
        <Route 
          path="/admin/hotspots" 
          element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AdminHotspots />
              </AdminLayout>
            </ProtectedAdminRoute>
          } 
        />
        <Route 
          path="/admin/reports" 
          element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AdminReports />
              </AdminLayout>
            </ProtectedAdminRoute>
          } 
        />
        <Route 
          path="/admin/users" 
          element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AdminUsers />
              </AdminLayout>
            </ProtectedAdminRoute>
          } 
        />
        <Route 
          path="/admin/profile" 
          element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AdminProfile />
              </AdminLayout>
            </ProtectedAdminRoute>
          } 
        />

        {/* Driver / Commuter Navigation Experience (Protected) */}
        <Route 
          path="/user/navigation" 
          element={
            <ProtectedUserRoute>
              <UserLayout>
                <UserNavigation />
              </UserLayout>
            </ProtectedUserRoute>
          } 
        />
        <Route 
          path="/user/alerts" 
          element={
            <ProtectedUserRoute>
              <UserLayout>
                <UserAlerts />
              </UserLayout>
            </ProtectedUserRoute>
          } 
        />
        <Route 
          path="/user/routes" 
          element={
            <ProtectedUserRoute>
              <UserLayout>
                <UserRoutes />
              </UserLayout>
            </ProtectedUserRoute>
          } 
        />
        <Route 
          path="/user/profile" 
          element={
            <ProtectedUserRoute>
              <UserLayout>
                <UserProfile />
              </UserLayout>
            </ProtectedUserRoute>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
