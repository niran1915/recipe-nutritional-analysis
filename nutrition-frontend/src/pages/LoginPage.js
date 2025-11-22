import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate, Link, useLocation } from 'react-router-dom';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname;

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await api.post('/login', {
                Email: email,
                Password: password
            });

            if (response.data.access_token) {
                // Save all user data
                localStorage.setItem('token', response.data.access_token);
                localStorage.setItem('user_id', response.data.user_id);
                localStorage.setItem('role', response.data.role); // <-- SAVE ROLE

                window.dispatchEvent(new Event('authChange'));
                
                // --- NEW: Redirect logic ---
                // If they are an admin, send them to the admin panel
                if (response.data.role === 'admin') {
                    navigate('/admin-dashboard', { replace: true });
                } else {
                    // Otherwise, send user to where they were going, or their dashboard
                    navigate(from || '/dashboard', { replace: true });
                }
            }
        } catch (err) {
            if (err.response && err.response.data) {
                setError(err.response.data.error || 'Login failed!');
            } else {
                setError('Login failed. Please try again.');
            }
        }
    };

    return (
        <div className="form-container">
            <h2 className="form-title">Sign In</h2>
            <form onSubmit={handleLogin}>
                <div className="form-group">
                    <label htmlFor="email">Email address</label>
                    <input
                        id="email" type="email" required
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        id="password" type="password" required
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />
                </div>
                {error && <p className="error-message">{error}</p>}
                <div className="form-group">
                    <button type="submit" className="form-button">
                        Sign In
                    </button>
                </div>
            </form>
            <p className="form-text-link">
                Don't have an account?{' '}
                <Link to="/signup">Sign up</Link>
            </p>
        </div>
    );
}