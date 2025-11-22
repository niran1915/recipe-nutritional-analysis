import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function MealPlanListPage() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [planName, setPlanName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const response = await api.get('/mealplans');
            setPlans(response.data);
        } catch (err) {
            setError('Could not fetch meal plans.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleCreatePlan = async (e) => {
        e.preventDefault();
        try {
            await api.post('/mealplans', {
                Plan_Name: planName,
                Start_Date: startDate || null,
                End_Date: endDate || null
            });
            setPlanName('');
            setStartDate('');
            setEndDate('');
            fetchPlans();
        } catch (err) {
            setError('Failed to create plan.');
        }
    };

    if (loading) return <div className="container"><p>Loading meal plans...</p></div>;
    if (error) return <div className="container"><p className="error-message">{error}</p></div>;

    return (
        <div className="container">
            <div className="detail-grid">
                <div className="detail-main">
                    <h1>My Meal Plans</h1>
                    {plans.length === 0 ? (
                        <p>You haven't created any meal plans yet.</p>
                    ) : (
                        <div className="card-grid">
                            {plans.map(plan => (
                                <div key={plan.MealPlan_ID} className="card">
                                    <div className="card-content">
                                        <h3 className="card-title">{plan.Plan_Name}</h3>
                                        <p className="card-description">
                                            {plan.Start_Date} to {plan.End_Date}
                                        </p>
                                        <div className="card-footer">
                                            <Link to={`/mealplans/${plan.MealPlan_ID}`} className="button">
                                                View Plan &rarr;
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="detail-sidebar">
                    <h3>Create New Plan</h3>
                    <form onSubmit={handleCreatePlan}>
                        <div className="form-group">
                            <label>Plan Name</label>
                            <input type="text" value={planName} onChange={(e) => setPlanName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Start Date</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>End Date</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                        <button type="submit" className="form-button">Create</button>
                    </form>
                </div>
            </div>
        </div>
    );
}