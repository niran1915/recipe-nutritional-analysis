import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// Simple card component for displaying stats
const StatCard = ({ title, value }) => (
    <div className="summary-card" style={{padding: '1.5rem'}}>
        <div className="summary-item">
            <span className="label" style={{fontSize: '0.875rem'}}>{title}</span>
            <span className="value calories" style={{fontSize: '2.25rem'}}>{value}</span>
        </div>
    </div>
);

export default function AdminAnalyticsPage() {
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/statistics');
            setStats(response.data);
        } catch (err) {
            setError("Could not fetch site statistics.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    if (loading) return <div className="container"><p>Loading analytics...</p></div>;
    if (error) return <div className="container"><p className="error-message">{error}</p></div>;

    return (
        <div className="container">
            <h1>Site Analytics</h1>
            <p>A high-level overview of the entire application database.</p>

            <div className="dashboard-grid" style={{marginTop: '2rem'}}>
                <StatCard title="Total Users" value={stats.total_users || 0} />
                <StatCard title="Total Recipes" value={stats.total_recipes || 0} />
                <StatCard title="Most Popular Recipe" value={stats.most_popular_recipe || 'N/A'} />
            </div>
        </div>
    );
}