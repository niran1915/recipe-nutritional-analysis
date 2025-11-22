// src/pages/SignupPage.js
import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // 1. Create the new user
            await api.post('/users', {
                Name: name,
                Email: email,
                Password: password
                // Add other fields like height/weight here if you want
            });
            
            // 2. --- NEW: Automatically log them in ---
            const loginResponse = await api.post('/login', {
                Email: email,
                Password: password
            });

            if (loginResponse.data.access_token) {
                // 3. Save their token and user_id
                localStorage.setItem('token', loginResponse.data.access_token);
                localStorage.setItem('user_id', loginResponse.data.user_id);
                
                // 4. Fire the auth event to update the navbar
                window.dispatchEvent(new Event('authChange'));
                
                // 5. Redirect to the dashboard
                navigate('/dashboard');
            }
            // --- END OF NEW LOGIC ---

        } catch (err) {
            if (err.response && err.response.data) {
                setError(err.response.data.error || 'Signup failed!');
            } else {
                setError('Signup failed. Please try again.');
            }
        }
    };

    return (
        <div className="form-container">
            <h2 className="form-title">Create Your Account</h2>
            <form onSubmit={handleSignup}>
                <div className="form-group">
                    <label>Name</label>
                    <input
                        type="text" required value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                    />
                </div>
                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                    />
                </div>
                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />
                </div>
                {/* You can add back Height/Weight fields here if needed */}

                {error && <p className="error-message">{error}</p>}

                <div className="form-group">
                    <button type="submit" className="form-button">
                        Sign Up
                    </button>
                </div>
            </form>
            <p className="form-text-link">
                Already have an account?{' '}
                <Link to="/login">Sign in</Link>
            </p>
        </div>
    );
}