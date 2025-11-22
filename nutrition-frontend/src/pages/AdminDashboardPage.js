import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function AdminDashboardPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAllUsers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/users');
            setUsers(response.data);
        } catch (err) {
            if (err.response && err.response.status === 403) {
                setError("You do not have permission to view this page.");
            } else {
                setError("Could not fetch user data.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllUsers();
    }, [fetchAllUsers]);

    if (loading) return <div className="container"><p>Loading admin panel...</p></div>;
    if (error) return <div className="container"><p className="error-message">{error}</p></div>;

    return (
        <div className="container">
            <h1>User Management</h1>
            <p>This panel displays all users currently in the database.</p>

            <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Joined On</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.User_ID}>
                                <td>{user.User_ID}</td>
                                <td>{user.Name}</td>
                                <td>{user.Email}</td>
                                <td>
                                    <span 
                                        className="card-tag" 
                                        style={{
                                            backgroundColor: user.role === 'admin' ? '#fecaca' : '#dcfce7', // Red or Green
                                            color: user.role === 'admin' ? '#991b1b' : '#166534'
                                        }}
                                    >
                                        {user.role}
                                    </span>
                                </td>
                                <td>{new Date(user.Created_At).toLocaleDateString()}</td>
                                <td>
                                    <Link 
                                        to={`/admin/edit-user/${user.User_ID}`} 
                                        className="button button-secondary"
                                        style={{fontSize: '0.75rem', padding: '0.25rem 0.5rem'}}
                                    >
                                        Edit
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}