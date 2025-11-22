import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Import Layout & Pages
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import RecipeListPage from './pages/RecipeListPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import RecipeForm from './pages/RecipeForm';
import MealPlanListPage from './pages/MealPlanListPage';
import MealPlanDetailPage from './pages/MealPlanDetailPage';
import ProfilePage from './pages/ProfilePage';
import DietLogPage from './pages/DietLogPage'; 
import IngredientListPage from './pages/IngredientListPage'; 
import IngredientForm from './pages/IngredientForm';
import AdminDashboardPage from './pages/AdminDashboardPage'; // <-- 1. IMPORT ADMIN PAGE
import AdminEditUserPage from './pages/AdminEditUserPage'; // <-- 2. IMPORT ADMIN EDIT PAGE
import AdminAnalyticsPage from './pages/AdminAnalyticsPage'; // <-- 3. IMPORT ANALYTICS PAGE

// This component handles all auth logic
const AuthWrapper = ({ 
    children, 
    isProtected = false, // Does this route require a login?
    isAdminOnly = false, // Is this route ONLY for admins?
    isUserOnly = false   // Is this route ONLY for users?
}) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const location = useLocation();

    if (isProtected || isAdminOnly || isUserOnly) {
        // --- 1. Check if logged in at all ---
        if (!token) {
            // Not logged in, redirect to login
            return <Navigate to="/login" replace state={{ from: location }} />;
        }
        
        // --- 2. Check Admin-Only routes ---
        if (isAdminOnly && role !== 'admin') {
            // A normal user tried to access an admin page. Kick to user dashboard.
            return <Navigate to="/dashboard" replace />; 
        } 
        
        // --- 3. Check User-Only routes ---
        if (isUserOnly && role === 'admin') {
            // An admin tried to access a user-only page. Kick to admin dashboard.
            return <Navigate to="/admin-dashboard" replace />;
        }
    } else {
        // --- PUBLIC-ONLY ROUTE LOGIC (/login, /signup, /) ---
        if (token) {
            // If a logged-in user is here, send them to their correct home
            const homeRoute = role === 'admin' ? "/admin-dashboard" : "/dashboard";
            return <Navigate to={homeRoute} replace />;
        }
    }
    
    // If all checks pass, render the page
    return children;
};

// This component adds the correct class to the page wrapper
const PageWrapper = ({ children }) => {
    const location = useLocation();
    // Only the landing page gets the special 'landing' class
    const wrapperClass = location.pathname === '/' ? "page-content landing" : "page-content";
    
    return <div className={wrapperClass}>{children}</div>;
};

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <PageWrapper>
        <Routes>
          {/* Public-Only Routes */}
          <Route path="/" element={<AuthWrapper><LandingPage /></AuthWrapper>} />
          <Route path="/login" element={<AuthWrapper><LoginPage /></AuthWrapper>} />
          <Route path="/signup" element={<AuthWrapper><SignupPage /></AuthWrapper>} />

          {/* Protected User-Only Routes */}
          <Route 
            path="/dashboard" 
            element={<AuthWrapper isUserOnly={true}><DashboardPage /></AuthWrapper>} 
          />
          <Route 
            path="/diet-logs" 
            element={<AuthWrapper isUserOnly={true}><DietLogPage /></AuthWrapper>} 
          />
           <Route 
            path="/profile" 
            element={<AuthWrapper isUserOnly={true}><ProfilePage /></AuthWrapper>} 
          />
          
          {/* Shared Content Routes (Users & Admins) */}
          <Route 
            path="/recipes" 
            element={<AuthWrapper isProtected={true}><RecipeListPage /></AuthWrapper>} 
          />
          <Route 
            path="/recipes/:id" 
            element={<AuthWrapper isProtected={true}><RecipeDetailPage /></AuthWrapper>} 
          />
          <Route 
            path="/recipes/new" 
            element={<AuthWrapper isProtected={true}><RecipeForm /></AuthWrapper>} 
          />
          <Route 
            path="/recipes/edit/:id" 
            element={<AuthWrapper isProtected={true}><RecipeForm /></AuthWrapper>} 
          />
          <Route 
            path="/ingredients" 
            element={<AuthWrapper isProtected={true}><IngredientListPage /></AuthWrapper>} 
          />
           <Route 
            path="/ingredients/new" 
            element={<AuthWrapper isProtected={true}><IngredientForm /></AuthWrapper>} 
          />
           <Route 
            path="/ingredients/edit/:id" 
            element={<AuthWrapper isProtected={true}><IngredientForm /></AuthWrapper>} 
          />
          <Route 
            path="/mealplans" 
            element={<AuthWrapper isProtected={true}><MealPlanListPage /></AuthWrapper>} 
          />
           <Route 
            path="/mealplans/:id" 
            element={<AuthWrapper isProtected={true}><MealPlanDetailPage /></AuthWrapper>} 
          />

          {/* Admin-Only Routes */}
          <Route 
            path="/admin-dashboard" 
            element={
                <AuthWrapper isAdminOnly={true}>
                    <AdminDashboardPage /> 
                </AuthWrapper>
            } 
          />
          <Route 
            path="/admin/edit-user/:id" 
            element={
                <AuthWrapper isAdminOnly={true}>
                    <AdminEditUserPage /> 
                </AuthWrapper>
            } 
          />
          <Route 
            path="/admin-analytics" 
            element={
                <AuthWrapper isAdminOnly={true}>
                    <AdminAnalyticsPage /> 
                </AuthWrapper>
            } 
          />

          {/* Catch-all: Redirect any unknown URL */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageWrapper>
    </BrowserRouter>
  );
}

export default App;