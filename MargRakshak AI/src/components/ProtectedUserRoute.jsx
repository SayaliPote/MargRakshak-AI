import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedUserRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <Navigate 
        to="/login" 
        replace 
        state={{ role: 'user', message: 'Please log in to access this page.' }} 
      />
    );
  }

  return children;
}
