import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useParams, useNavigate, Link } from 'react-router-dom';

export default function AdminEditUserPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // --- NEW: State for password reset ---
    const [newPassword, setNewPassword] = useState('');

    const fetchUserData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/users/${id}`); // Admin route
            const userData = res.data;
            // Format date for the input field
            setFormData({
                ...userData,
                Date_Of_Birth: userData.Date_Of_Birth ? userData.Date_Of_Birth.split('T')[0] : ''
            });
        } catch (err) {
            setError('Could not fetch user data.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setMessage('Updating...');
        try {
            await api.put(`/admin/users/${id}`, formData); // Admin route
            setMessage('User updated successfully!');
            setError('');
        } catch (err) {
            setError('Failed to update user.');
            setMessage('');
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
            try {
                await api.delete(`/admin/users/${id}`); // Admin route
                alert('User deleted.');
                navigate('/admin-dashboard');
            } catch (err) {
                // --- NEW: Show specific error from backend ---
                if (err.response && err.response.data && err.response.data.error) {
                    setError(err.response.data.error);
                } else {
                    setError('Failed to delete user.');
                }
            }
        }
    };

    // --- NEW: Handler for password reset ---
    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!newPassword) {
            setError('Password cannot be empty.');
            return;
        }
        setMessage('Resetting password...');
        try {
            await api.post(`/admin/users/${id}/reset-password`, {
                new_password: newPassword
            });
            setMessage('Password reset successfully!');
            setNewPassword('');
            setError('');
        } catch (err) {
            setError('Failed to reset password.');
            setMessage('');
        }
    };

    if (loading) return <div className="container"><p>Loading user...</p></div>;
    
    return (
        <div className="container">
            <Link to="/admin-dashboard" style={{marginBottom: '1rem', display: 'inline-block'}}>&larr; Back to User Management</Link>
            <h1>Edit User: {formData.Name}</h1>
            <p>Admin panel for updating or deleting a user profile.</p>
            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}

            <div className="detail-grid">
                <div className="detail-main">
                    <form className="form-container" style={{margin: 0, width: '100%'}} onSubmit={handleUpdate}>
                        <h3>User Details</h3>
                        
                        <div className="form-group">
                            <label>Name</label>
                            <input type="text" name="Name" value={formData.Name || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" name="Email" value={formData.Email || ''} onChange={handleChange} />
                        </div>
                        
                        {/* --- THIS IS THE NEW PERMISSION --- */}
                        <div className="form-group">
                            <label>Role (Permission)</label>
                            <select name="role" value={formData.role || 'user'} onChange={handleChange}>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        {/* ---------------------------------- */}
                        
                        <div className="form-group">
                            <label>Date of Birth</label>
                            <input type="date" name="Date_Of_Birth" value={formData.Date_Of_Birth || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Height (cm)</label>
                            <input type="number" name="Height_cm" value={formData.Height_cm || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Weight (kg)</label>
                            <input type="number" name="Weight_kg" value={formData.Weight_kg || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Activity Level</label>
                            <select name="Activity_Level" value={formData.Activity_Level || 'Moderate'} onChange={handleChange}>
                                <option value="Sedentary">Sedentary</option>
                                <option value="Light">Light</option>
                                <option value="Moderate">Moderate</option>
                                <option value="Active">Active</option>
                                <option value="Very Active">Very Active</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Dietary Preferences</label>
                            <input type="text" name="Dietary_Preferences" value={formData.Dietary_Preferences || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Allergies</label>
                            <input type="text" name="Allergies" value={formData.Allergies || ''} onChange={handleChange} />
                        </div>
                        
                        <button type="submit" className="form-button">Save Changes</button>
                    </form>
                </div>
                <div className="detail-sidebar">
                    {/* --- NEW PASSWORD RESET FORM --- */}
                    <h3>Reset Password</h3>
                    <form className="form-container" style={{padding: '1.5rem', margin: '0 0 2rem 0', boxShadow: 'none', border: '1px solid #e5e7eb'}} onSubmit={handlePasswordReset}>
                        <div className="form-group">
                            <label>New Password</label>
                            <input 
                                type="text" 
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)} 
                                placeholder="Enter new password"
                                required 
                            />
                        </div>
                        <button type="submit" className="form-button">Reset Password</button>
                    </form>
                    
                    <h3>Danger Zone</h3>
                    <p>This action is permanent and cannot be undone.</p>
                    <button onClick={handleDelete} className="button button-danger">Delete This User</button>
                </div>
            </div>
        </div>
    );
}