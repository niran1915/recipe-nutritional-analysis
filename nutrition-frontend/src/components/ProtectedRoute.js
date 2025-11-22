import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
        // If no token, redirect to the login page
        return <Navigate to="/login" replace />;
    }

    // If token exists, show the page
    return children;
};

export default ProtectedRoute;