import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useParams, useNavigate, Link } from 'react-router-dom';

export default function RecipeForm() {
    const { id } = useParams(); 
    const navigate = useNavigate();
    const isEditing = Boolean(id);
    
    const [formData, setFormData] = useState({
        Recipe_Name: '',
        Description: '',
        Cuisine_Type: '',
        Preparation_Time_minutes: 0,
        Cooking_Time_minutes: 0,
        Serving_Size: 1,
        Difficulty_Level: 'Easy',
        Instructions: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isEditing) {
            setLoading(true);
            api.get(`/recipes/${id}`)
                .then(res => {
                    setFormData(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    setError('Failed to load recipe');
                    setLoading(false);
                });
        }
    }, [id, isEditing]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            let response;
            if (isEditing) {
                response = await api.put(`/recipes/${id}`, formData);
            } else {
                response = await api.post('/recipes', formData);
            }
            navigate(`/recipes/${response.data.Recipe_ID}`);
        } catch (err) {
            setError('Failed to save recipe. Please check your inputs.');
        }
    };

    if (loading) return <div className="container"><p>Loading form...</p></div>;

    return (
        <div className="form-container" style={{maxWidth: '800px'}}>
            <h2 className="form-title">{isEditing ? 'Edit Recipe' : 'Create New Recipe'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Recipe Name</label>
                    <input
                        type="text" name="Recipe_Name" required
                        value={formData.Recipe_Name} onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label>Description</label>
                    <textarea
                        name="Description"
                        value={formData.Description} onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label>Instructions</label>
                    <textarea
                        name="Instructions"
                        value={formData.Instructions} onChange={handleChange}
                    />
                </div>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
                    <div className="form-group">
                        <label>Cuisine Type</label>
                        <input
                            type="text" name="Cuisine_Type"
                            value={formData.Cuisine_Type} onChange={handleChange}
                        />
                    </div>
                    <div className="form-group">
                        <label>Prep Time (min)</label>
                        <input
                            type="number" name="Preparation_Time_minutes"
                            value={formData.Preparation_Time_minutes} onChange={handleChange}
                        />
                    </div>
                    <div className="form-group">
                        <label>Cook Time (min)</label>
                        <input
                            type="number" name="Cooking_Time_minutes"
                            value={formData.Cooking_Time_minutes} onChange={handleChange}
                        />
                    </div>
                     <div className="form-group">
                        <label>Serving Size</label>
                        <input
                            type="number" name="Serving_Size"
                            value={formData.Serving_Size} onChange={handleChange}
                        />
                    </div>
                     <div className="form-group">
                        <label>Difficulty</label>
                        <select
                            name="Difficulty_Level"
                            value={formData.Difficulty_Level} onChange={handleChange}
                        >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>
                </div>

                {error && <p className="error-message">{error}</p>}

                <div className="form-group" style={{marginTop: '1.5rem', display: 'flex', gap: '1rem'}}>
                    <button type="submit" className="form-button">
                        {isEditing ? 'Save Changes' : 'Create Recipe'}
                    </button>
                    <Link 
                        to={isEditing ? `/recipes/${id}` : '/recipes'} 
                        className="button button-secondary"
                    >
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}