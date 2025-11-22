import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
    
    // Get the user's role from localStorage
    const [userRole, setUserRole] = useState(localStorage.getItem('role'));

    // Check if we are on the public landing page
    const isLandingPage = location.pathname === '/';

    useEffect(() => {
        // This function runs when login/logout happens
        const handleAuthChange = () => {
            const token = !!localStorage.getItem('token');
            setIsLoggedIn(token);
            setUserRole(localStorage.getItem('role')); // Update the role
        };
        window.addEventListener('authChange', handleAuthChange);
        return () => {
            window.removeEventListener('authChange', handleAuthChange);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('role'); // <-- Make sure to remove the role
        window.dispatchEvent(new Event('authChange'));
        navigate('/login');
    };

    const getLinkClass = ({ isActive }) => (isActive ? 'active' : '');

    // Add 'transparent' class if on the landing page and logged out
    const navBarClass = isLandingPage && !isLoggedIn ? "navbar transparent" : "navbar";

    // The brand logo now links to the correct dashboard based on role
    let homeLink = "/";
    if (isLoggedIn) {
        homeLink = userRole === 'admin' ? "/admin-dashboard" : "/dashboard";
    }

    return (
        <nav className={navBarClass}>
            <div className="navbar-container">
                <NavLink to={homeLink} className="navbar-brand">
                    <span>NutritionDB</span>
                </NavLink>

                <div className="navbar-links">
                    {!isLoggedIn ? (
                        // --- 1. LOGGED OUT STATE ---
                        <>
                            <NavLink to="/login" className={getLinkClass}>
                                Sign In
                            </NavLink>
                            <NavLink to="/signup" className="button button-primary">
                                Sign Up
                            </NavLink>
                        </>
                    ) : userRole === 'admin' ? (
                        // --- 2. LOGGED IN AS ADMIN ---
                        <>
                            <NavLink to="/admin-dashboard" className={getLinkClass}>
                                User Management
                            </NavLink>
                            <NavLink to="/admin-analytics" className={getLinkClass}>
                                Site Analytics
                            </NavLink>
                            {/* --- ADMIN CONTENT LINKS --- */}
                            <NavLink to="/recipes" className={getLinkClass}>
                                All Recipes
                            </NavLink>
                             <NavLink to="/ingredients" className={getLinkClass}>
                                All Ingredients
                            </NavLink>
                            <NavLink to="/mealplans" className={getLinkClass}>
                                All Meal Plans
                            </NavLink>
                            <button onClick={handleLogout} className="button button-secondary">
                                Sign Out
                            </button>
                        </>
                    ) : (
                        // --- 3. LOGGED IN AS USER ---
                        <>
                            <NavLink to="/dashboard" className={getLinkClass}>
                                Dashboard
                            </NavLink>
                            <NavLink to="/diet-logs" className={getLinkClass}>
                                Diet Log
                            </NavLink>
                            <NavLink to="/recipes" className={getLinkClass}>
                                My Recipes
                            </NavLink>
                             <NavLink to="/ingredients" className={getLinkClass}>
                                Ingredients
                            </NavLink>
                            <NavLink to="/mealplans" className={getLinkClass}>
                                My Meal Plans
                            </NavLink>
                            <NavLink to="/profile" className={getLinkClass}>
                                Profile
                            </NavLink>
                            <button onClick={handleLogout} className="button button-secondary">
                                Sign Out
                            </button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}