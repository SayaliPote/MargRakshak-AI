import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedAdminRoute({ children }) {
  const { user } = useAuth();
  const userRole = String(user?.role || '').trim().toLowerCase();

  if (!user || userRole !== 'admin') {
    return (
      <Navigate 
        to="/admin/login" 
        replace 
        state={{ message: 'Please log in with an authorized admin account.' }} 
      />
    );
  }

  return children;
}
