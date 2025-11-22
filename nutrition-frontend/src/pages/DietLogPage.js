import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// --- NEW: Editable Log Item Component ---
const EditableLogItem = ({ log, allRecipes, onRefresh, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');
    
    // Form state for editing
    const [editData, setEditData] = useState({
        Recipe_ID: log.Recipe_ID,
        Date: log.Date.split('T')[0], // Format date for input
        Time: log.Time,
        Portion_Size: log.Portion_Size,
        Notes: log.Notes
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/dietlogs/${log.Log_ID}`, editData);
            setIsEditing(false);
            onRefresh(); // Refresh the main log list
        } catch (err) {
            setError('Failed to update log.');
        }
    };

    return (
        <li className="list-item">
            {isEditing ? (
                // --- EDITING VIEW ---
                <form onSubmit={handleUpdate} style={{width: '100%'}}>
                    <select name="Recipe_ID" value={editData.Recipe_ID} onChange={handleChange} required>
                        {allRecipes.map(recipe => (
                            <option key={recipe.Recipe_ID} value={recipe.Recipe_ID}>
                                {recipe.Recipe_Name}
                            </option>
                        ))}
                    </select>
                    <input type="date" name="Date" value={editData.Date} onChange={handleChange} required />
                    <input type="time" name="Time" value={editData.Time} onChange={handleChange} required />
                    <input type="number" min="0.1" step="0.1" name="Portion_Size" value={editData.Portion_Size} onChange={handleChange} required />
                    <textarea name="Notes" value={editData.Notes} onChange={handleChange} />
                    {error && <p className="error-message">{error}</p>}
                    <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                        <button type="submit" className="button" style={{width: 'auto'}}>Save</button>
                        <button type="button" className="button button-secondary" style={{width: 'auto'}} onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                </form>
            ) : (
                // --- DISPLAY VIEW ---
                <>
                    <div>
                        <strong>{log.Recipe_Name}</strong> (Portion: {log.Portion_Size})<br/>
                        <small>{new Date(log.Date).toLocaleDateString()} at {log.Time}</small>
                        <p style={{fontSize: '0.875rem', margin: '0.25rem 0 0 0'}}>{log.Notes}</p>
                    </div>
                    <div>
                        <button onClick={() => setIsEditing(true)} className="button button-secondary" style={{marginRight: '0.5rem'}}>Edit</button>
                        <button onClick={() => onDelete(log.Log_ID)} className="button button-danger">Delete</button>
                    </div>
                </>
            )}
        </li>
    );
};


// --- Main Diet Log Page ---
export default function DietLogPage() {
    const [logs, setLogs] = useState([]);
    const [allRecipes, setAllRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State for new log form
    const [recipeId, setRecipeId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [time, setTime] = useState(new Date().toTimeString().split('T')[0].substring(0, 5)); // Default to now
    const [portion, setPortion] = useState(1);
    const [notes, setNotes] = useState('');

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const logRes = await api.get('/dietlogs');
            setLogs(logRes.data);
            
            const recipeRes = await api.get('/recipes');
            setAllRecipes(recipeRes.data);
            
            // Set default recipeId for the form if not already set
            if (recipeRes.data.length > 0 && !recipeId) {
                setRecipeId(recipeRes.data[0].Recipe_ID);
            }
        } catch (err) {
            setError('Could not fetch diet logs.');
        } finally {
            setLoading(false);
        }
    }, [recipeId]); // Add recipeId as dependency

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleAddLog = async (e) => {
        e.preventDefault();
        try {
            await api.post('/dietlogs', {
                Recipe_ID: recipeId,
                Date: date,
                Time: time,
                Portion_Size: portion,
                Notes: notes,
                is_finished: false // New logs are not finished by default
            });
            // Reset form and refresh list
            setNotes('');
            setPortion(1);
            fetchLogs();
        } catch (err) {
            setError('Failed to add log.');
        }
    };

    const handleDeleteLog = async (logId) => {
        if (window.confirm('Are you sure you want to delete this log?')) {
            try {
                await api.delete(`/dietlogs/${logId}`);
                fetchLogs(); // Refresh list
            } catch (err) {
                setError('Failed to delete log.');
            }
        }
    };

    if (loading) return <div className="container"><p>Loading diet logs...</p></div>;

    return (
        <div className="container">
            <div className="detail-grid">
                <div className="detail-main">
                    <h1>My Diet Log</h1>
                    <p>Log all meals you've eaten here. They will appear on your Dashboard to be confirmed.</p>
                    {error && <p className="error-message">{error}</p>}
                    <ul className="list">
                        {logs.map(log => (
                            <EditableLogItem 
                                key={log.Log_ID} 
                                log={log} 
                                allRecipes={allRecipes}
                                onRefresh={fetchLogs}
                                onDelete={handleDeleteLog}
                            />
                        ))}
                    </ul>
                </div>
                <div className="detail-sidebar">
                    <h3>Log a New Meal</h3>
                    <form onSubmit={handleAddLog}>
                        <div className="form-group">
                            <label>Recipe</label>
                            <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)} required>
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
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Time</label>
                            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Portion Size</label>
                            <input type="number" min="0.1" step="0.1" value={portion} onChange={(e) => setPortion(e.target.value)} required />
                        </div>
                         <div className="form-group">
                            <label>Notes</label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                        <button type="submit" className="form-button">Add to Log</button>
                    </form>
                </div>
            </div>
        </div>
    );
}