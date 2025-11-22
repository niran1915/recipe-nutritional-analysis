import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom'; // <-- This import is critical

export default function ProfilePage() {
    const [user, setUser] = useState({});
    const [weightHistory, setWeightHistory] = useState([]);
    const [planSummary, setPlanSummary] = useState([]); 

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({});
    const [newWeight, setNewWeight] = useState('');
    const [formMessage, setFormMessage] = useState('');

    const userId = localStorage.getItem('user_id');

    // --- THIS IS THE UPDATED LOGIC ---
    // We now have two separate functions to fetch data
    
    // 1. Fetches the ESSENTIAL data (Profile & Weight)
    const fetchEssentialData = useCallback(async () => {
        try {
            setLoading(true);
            const [userRes, weightRes] = await Promise.all([
                api.get(`/users/${userId}`),
                api.get(`/users/${userId}/weight-history`)
            ]);
            
            setUser(userRes.data);
            setWeightHistory(weightRes.data);
            
            // Pre-fill the form, handling null dates
            setFormData({
                ...userRes.data,
                Date_Of_Birth: userRes.data.Date_Of_Birth ? userRes.data.Date_Of_Birth.split('T')[0] : ''
            }); 

        } catch (err) {
            console.error("Failed to fetch essential profile data:", err);
            setError('Could not fetch your profile. Please try logging in again.');
        } finally {
            // We stop the main loading here
            setLoading(false); 
        }
    }, [userId]);

    // 2. Fetches the NON-ESSENTIAL summary data
    const fetchSummaryData = useCallback(async () => {
        try {
            const summaryRes = await api.get(`/users/${userId}/mealplan-summary`);
            setPlanSummary(summaryRes.data);
        } catch (err) {
            // Don't set a page-blocking error, just log it
            console.warn("Could not fetch meal plan summary:", err);
            // You could set a minor, non-blocking error here
            // setError('Could not load meal plan summary.');
        }
    }, [userId]);


    // 3. useEffect now calls both functions
    useEffect(() => {
        fetchEssentialData();
        fetchSummaryData();
    }, [fetchEssentialData, fetchSummaryData]);

    // --- END OF UPDATED LOGIC ---


    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setFormMessage('Updating...');
        try {
            const res = await api.put(`/users/${userId}`, formData);
            setFormMessage('Profile updated successfully!');
            
            // Update user state from the response of the PUT request
            // This ensures the "Profile Summary" card also updates
            setUser(res.data);
            setFormData({
                ...res.data,
                Date_Of_Birth: res.data.Date_Of_Birth ? res.data.Date_Of_Birth.split('T')[0] : ''
            });

        } catch (err) {
            setFormMessage('Failed to update profile.');
        }
    };

    const handleWeightUpdate = async (e) => {
        e.preventDefault();
        setFormMessage('Updating weight...');
        try {
            await api.put(`/users/${userId}/weight`, { weight: newWeight });
            setFormMessage('Weight updated successfully!');
            // Refresh ALL data to get new BMI and weight history
            fetchEssentialData(); 
            setNewWeight('');
        } catch (err) {
            setFormMessage('Failed to update weight.');
        }
    };

    if (loading) return <div className="container"><p>Loading profile...</p></div>;
    
    // Show the main error if essential data failed
    if (error) return <div className="container"><p className="error-message">{error}</p></div>;

    return (
        <div className="container">
            <h1>My Profile</h1>
            {formMessage && <p className="success-message">{formMessage}</p>}
            
            <div className="detail-grid">
                {/* --- Main column for forms and meal summary --- */}
                <div className="detail-main">
                    <form className="form-container" style={{margin: 0, width: '100%'}} onSubmit={handleProfileUpdate}>
                        <h3>Edit Details</h3>
                        
                        <div className="form-group">
                            <label>Name</label>
                            <input type="text" name="Name" value={formData.Name || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" name="Email" value={formData.Email || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Date of Birth</label>
                            <input type="date" name="Date_Of_Birth" value={formData.Date_Of_Birth || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Gender</label>
                            <select name="Gender" value={formData.Gender || 'Other'} onChange={handleChange}>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Height (cm)</label>
                            <input type="number" name="Height_cm" value={formData.Height_cm || ''} onChange={handleChange} />
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
                            <input type="text" name="Dietary_Preferences" value={formData.Dietary_Preferences || ''} onChange={handleChange} placeholder="e.g., Vegetarian, Low-carb" />
                        </div>
                        <div className="form-group">
                            <label>Allergies</label>
                            <input type="text" name="Allergies" value={formData.Allergies || ''} onChange={handleChange} placeholder="e.g., Peanuts, Gluten" />
                        </div>
                         <div className="form-group">
                            <label>Current Weight (kg)</label>
                            <input type="number" name="Weight_kg" value={user.Weight_kg || ''} readOnly disabled title="Update weight in the sidebar" />
                        </div>
                        <div className="form-group">
                            <label>Current BMI</label>
                            <input type="text" name="BMI" value={user.BMI || 'N/A'} readOnly disabled />
                        </div>
                        
                        <button type="submit" className="form-button">Save Profile Changes</button>
                    </form>

                    <div style={{marginTop: '2rem'}}>
                        <h2>My Meal Plan Summary</h2>
                        {planSummary.length === 0 ? (
                            <p>You have no meals in your meal plans. Go to the <Link to="/mealplans">Meal Plans</Link> page to add some.</p>
                        ) : (
                            <ul className="list">
                                {planSummary.map((item, index) => (
                                    <li key={index} className="summary-list-item">
                                        <div>
                                            <strong>{item.Recipe_Name}</strong><br/>
                                            <small>{item.Plan_Name} - {item.Meal_Type}</small>
                                        </div>
                                        <div>
                                            <small>{new Date(item.Day_of_Plan).toLocaleDateString()}</small><br/>
                                            <strong>{item.Recipe_Calories.toFixed(0)} kcal</strong>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* --- Sidebar for Summaries & Weight --- */}
                <div className="detail-sidebar">
                    {/* --- NEW PROFILE SUMMARY SECTION --- */}
                    <h3>Profile Summary</h3>
                    <div className="summary-card" style={{marginBottom: '2rem'}}>
                        <div className="summary-item">
                            <span className="label">Height</span>
                            <span className="value">{user.Height_cm || 'N/A'} cm</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Weight</span>
                            <span className="value">{user.Weight_kg || 'N/A'} kg</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">BMI</span>
                            <span className="value calories">{user.BMI || 'N/A'}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Gender</span>
                            <span className="value">{user.Gender || 'N/A'}</span>
                        </div>
                         <div className="summary-item">
                            <span className="label">Activity Level</span>
                            <span className="value">{user.Activity_Level || 'N/A'}</span>
                        </div>
                         <div className="summary-item">
                            <span className="label">Diet</span>
                            <span className="value">{user.Dietary_Preferences || 'N/A'}</span>
                        </div>
                         <div className="summary-item">
                            <span className="label">Allergies</span>
                            <span className="value">{user.Allergies || 'None'}</span>
                        </div>
                    </div>
                    {/* --- END OF NEW SECTION --- */}
                
                    <h3>Update Weight</h3>
                    <form className="form-container" style={{padding: '1.5rem', margin: '0 0 2rem 0', boxShadow: 'none', border: '1px solid #e5e7eb'}} onSubmit={handleWeightUpdate}>
                        <div className="form-group">
                            <label>New Weight (kg)</label>
                            <input type="number" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} required />
                        </div>
                        <button type="submit" className="form-button">Log New Weight</button>
                    </form>

                    <h3>Weight History</h3>
                    <ul className="list">
                        {weightHistory.map(item => (
                            <li key={item.History_ID} className="list-item">
                                <span>{item.New_Weight} kg</span>
                                <small>{new Date(item.Updated_At).toLocaleDateString()}</small>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}