import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';

export default function MealPlanDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [plan, setPlan] = useState(null);
    const [allRecipes, setAllRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [summary, setSummary] = useState([]);

    // --- NEW: State for log message ---
    const [logMessage, setLogMessage] = useState('');

    const [selectedRecipe, setSelectedRecipe] = useState('');
    const [dayOfPlan, setDayOfPlan] = useState('');
    const [mealType, setMealType] = useState('Breakfast');

    const fetchPlanData = useCallback(async () => {
        // We set loading to true, but not error, so old errors don't vanish on refetch
        setLoading(true);
        try {
            const [planRes, recipesRes, summaryRes] = await Promise.all([
                api.get(`/mealplans/${id}`),
                api.get('/recipes'),
                api.get(`/mealplans/${id}/summary`)
            ]);
            
            setPlan(planRes.data);
            setAllRecipes(recipesRes.data);
            setSummary(summaryRes.data);
        } catch (err) {
            setError('Could not fetch meal plan details.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPlanData();
    }, [fetchPlanData]);

    const handleDeletePlan = async () => {
        if (window.confirm('Are you sure you want to delete this meal plan?')) {
            try {
                await api.delete(`/mealplans/${id}`);
                navigate('/mealplans');
            } catch (err) {
                setError('Could not delete meal plan.');
            }
        }
    };

    const handleAddRecipe = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/mealplans/${id}/recipes`, {
                Recipe_ID: selectedRecipe,
                Day_of_Plan: dayOfPlan || null,
                Meal_Type: mealType
            });
            fetchPlanData(); // Refresh all data
            setSelectedRecipe('');
            setDayOfPlan('');
            setLogMessage(''); // Clear any previous log message
        } catch (err) {
            setError('Failed to add recipe to plan.');
        }
    };

    const handleRemoveRecipe = async (mealPlanRecipeId) => {
        try {
            await api.delete(`/mealplan-recipes/${mealPlanRecipeId}`);
            fetchPlanData(); // Refresh all data
            setLogMessage('');
        } catch (err) {
            setError('Failed to remove recipe.');
        }
    };

    // --- NEW: Handler for the "Log Day" button ---
    const handleLogDay = async (date) => {
        if (!window.confirm(`Are you sure you want to add all meals from ${date} to your diet log?`)) {
            return;
        }
        try {
            const res = await api.post('/api/mealplans/log-day', {
                plan_id: id,
                date: date
            });
            setLogMessage(res.data.message); // e.g., "Successfully logged 3 meals."
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to log day.');
        }
    };

    const getSummaryByDay = () => {
        const days = {};
        summary.forEach(item => {
            const day = item.Day_of_Plan;
            if (!days[day]) {
                days[day] = { recipes: [], totalCalories: 0 };
            }
            days[day].recipes.push(item);
            days[day].totalCalories += item.Recipe_Calories;
        });
        return Object.entries(days).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    };

    if (loading) return <div className="container"><p>Loading...</p></div>;
    if (error) return <div className="container"><p className="error-message">{error}</p></div>;
    if (!plan) return null;

    const summaryByDay = getSummaryByDay();

    return (
        <div className="detail-container">
            {logMessage && <p className="success-message">{logMessage}</p>}
            <div className="detail-header">
                <div>
                    <h1>{plan.Plan_Name}</h1>
                    <p>{plan.Notes}</p>
                </div>
                <div className="detail-header-actions">
                    <button onClick={handleDeletePlan} className="button button-danger">Delete Plan</button>
                </div>
            </div>

            <div className="detail-grid">
                <div className="detail-main">
                    <h3>Recipes in this Plan</h3>
                    {plan.recipes.length === 0 ? (
                        <p>No recipes added yet.</p>
                    ) : (
                        <ul className="list">
                            {plan.recipes.map(item => (
                                <li key={item.MealPlan_Recipe_ID} className="list-item">
                                    <div>
                                        <strong>{item.Recipe_Name}</strong><br/>
                                        <small>{item.Meal_Type} on {item.Day_of_Plan}</small>
                                    </div>
                                    <button onClick={() => handleRemoveRecipe(item.MealPlan_Recipe_ID)}>
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    
                    <h3 style={{marginTop: '2rem'}}>Daily Nutritional Summary</h3>
                    {summaryByDay.length === 0 ? (
                        <p>No recipes with calories added to this plan yet.</p>
                    ) : (
                        <ul className="list">
                            {summaryByDay.map(([day, data]) => (
                                <li key={day} className="list-item">
                                    <div>
                                        <strong>{new Date(day).toLocaleDateString()}</strong><br/>
                                        <span style={{color: '#16a34a', fontWeight: 'bold'}}>
                                            Total: {data.totalCalories.toFixed(0)} kcal
                                        </span>
                                    </div>
                                    {/* --- NEW BUTTON --- */}
                                    <button 
                                        onClick={() => handleLogDay(day)} 
                                        className="button" 
                                        style={{fontSize: '0.75rem', padding: '0.25rem 0.5rem'}}
                                    >
                                        Log This Day
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="detail-sidebar">
                    <h3>Add Recipe to Plan</h3>
                    <form onSubmit={handleAddRecipe}>
                        <div className="form-group">
                            <label>Recipe</label>
                            <select value={selectedRecipe} onChange={(e) => setSelectedRecipe(e.target.value)} required>
                                <option value="" disabled>Select...</option>
                                {allRecipes.map(recipe => (
                                    <option key={recipe.Recipe_ID} value={recipe.Recipe_ID}>
                                        {recipe.Recipe_Name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input type="date" value={dayOfPlan} onChange={(e) => setDayOfPlan(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Meal Type</label>
                            <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
                                <option>Breakfast</option>
                                <option>Lunch</option>
                                <option>Dinner</option>
                                <option>Snack</option>
                            </select>
                        </div>
                        <button type="submit" className="form-button">Add to Plan</button>
                    </form>
                </div>
            </div>
        </div>
    );
}