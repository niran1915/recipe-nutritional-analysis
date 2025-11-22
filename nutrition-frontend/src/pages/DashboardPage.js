import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import NutritionPieChart from '../components/NutritionPieChart';

// SummaryCard component (no changes)
const SummaryCard = ({ title, data }) => (
    <div className="summary-card">
        <h2>{title}</h2>
        <div className="summary-item">
            <span className="label">Total Calories</span>
            <span className="value calories">{data.total_calories?.toFixed(0) || 0} kcal</span>
        </div>
        <div className="summary-item">
            <span className="label">Protein</span>
            <span className="value">{data.total_protein?.toFixed(1) || 0} g</span>
        </div>
        <div className="summary-item">
            <span className="label">Carbohydrates</span>
            <span className="value">{data.total_carbs?.toFixed(1) || 0} g</span>
        </div>
        <div className="summary-item">
            <span className="label">Fat</span>
            <span className="value">{data.total_fat?.toFixed(1) || 0} g</span>
        </div>
        <div className="summary-item">
            <span className="label">Fiber</span>
            <span className="value">{data.total_fiber?.toFixed(1) || 0} g</span>
        </div>
    </div>
);

export default function DashboardPage() {
    const [summaryToday, setSummaryToday] = useState({});
    const [summaryWeek, setSummaryWeek] = useState({});
    const [todayLogs, setTodayLogs] = useState([]);
    
    // --- NEW: State for Activity Feed ---
    const [activityLog, setActivityLog] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const getTodayDate = () => new Date().toISOString().split('T')[0];

    // Fetches the analysis summaries
    const fetchSummaries = useCallback(async () => {
        try {
            const todayRes = await api.get('/dietlogs/summary?days=1');
            setSummaryToday(todayRes.data);
            
            const weekRes = await api.get('/dietlogs/summary?days=7');
            setSummaryWeek(weekRes.data);
        } catch (err) {
            console.warn('Could not fetch nutritional summary.', err);
            setError('Could not fetch nutritional summary.');
        }
    }, []);

    // Fetches the list of meals for today
    const fetchTodayLogs = useCallback(async () => {
        try {
            const date = getTodayDate();
            const logsRes = await api.get(`/dietlogs?date=${date}`); 
            setTodayLogs(logsRes.data);
        } catch (err) {
            console.warn('Could not fetch today\'s logs.', err);
            setError('Could not fetch today\'s logs.');
        }
    }, []);

    // --- NEW: Fetches the Recipe Log for the activity feed ---
    const fetchActivityLog = useCallback(async () => {
        try {
            const logRes = await api.get('/recipe-log');
            setActivityLog(logRes.data);
        } catch (err) {
            console.warn('Could not fetch activity log.', err);
            // Don't set a page-blocking error for this non-critical feature
        }
    }, []);

    // Main data fetching function
    const fetchData = useCallback(async () => {
        setLoading(true);
        // Fetch all data in parallel for speed
        await Promise.all([
            fetchTodayLogs(),
            fetchSummaries(),
            fetchActivityLog() // <-- Add new function call
        ]);
        setLoading(false);
    }, [fetchTodayLogs, fetchSummaries, fetchActivityLog]); // <-- Add new dependency

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // This runs when you check/uncheck a box
    const handleToggleLog = async (logId) => {
        try {
            await api.put(`/dietlogs/${logId}/toggle`);
            // Refresh ALL data on the page
            fetchData();
        } catch (err) {
            setError('Failed to update log status.');
        }
    };

    if (loading) return <div className="container"><p>Loading dashboard...</p></div>;

    return (
        <div className="container">
            <h1>My Dashboard</h1>
            {error && <p className="error-message">{error}</p>}
            
            <div className="detail-container" style={{maxWidth: '100%', marginBottom: '2rem'}}>
                <h2>Today's Logged Meals</h2>
                <p>Check items as "Finished" to include them in the analysis below.</p>
                <ul className="list">
                    {todayLogs.length === 0 ? (
                        <p>No meals logged for today yet. Go to the <Link to="/diet-logs">Diet Log</Link> page to add some.</p>
                    ) : (
                        todayLogs.map(log => (
                            <li key={log.Log_ID} className="list-item">
                                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                    <input 
                                        type="checkbox"
                                        checked={log.is_finished}
                                        onChange={() => handleToggleLog(log.Log_ID)}
                                        style={{width: '1.25rem', height: '1.25rem', cursor: 'pointer'}}
                                    />
                                    <div>
                                        <strong>{log.Recipe_Name}</strong> (Portion: {log.Portion_Size})<br/>
                                        <small>{log.Time} - {log.Notes}</small>
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
            
            <h2 style={{marginTop: '3rem'}}>Nutritional Analysis</h2>
            <div className="dashboard-grid">
                <div className="summary-card">
                    <h3>Today's Summary</h3>
                    <SummaryCard title="Macro Totals (Finished Meals)" data={summaryToday} />
                    <h3 style={{marginTop: '2rem'}}>Calorie Breakdown</h3>
                    <div className="chart-container">
                        <NutritionPieChart summaryData={summaryToday} />
                    </div>
                </div>

                <div className="summary-card">
                    <h3>Last 7 Days Summary</h3>
                    <SummaryCard title="Macro Totals (Finished Meals)" data={summaryWeek} />
                    <h3 style={{marginTop: '2rem'}}>Calorie Breakdown</h3>
                    <div className="chart-container">
                        <NutritionPieChart summaryData={summaryWeek} />
                    </div>
                </div>
            </div>

            {/* --- NEW: Activity Feed Section --- */}
            <div className="detail-container" style={{maxWidth: '100%', marginTop: '2rem'}}>
                <h2>Recent Activity</h2>
                <ul className="list">
                    {activityLog.length === 0 ? (
                        <p>No recent activity. Go create a new recipe!</p>
                    ) : (
                        activityLog.map(log => (
                            <li key={log.Log_ID} className="list-item">
                                <div>
                                    <span>You created the recipe: <strong>{log.Recipe_Name}</strong></span>
                                </div>
                                <small>{new Date(log.Created_At).toLocaleDateString()}</small>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}