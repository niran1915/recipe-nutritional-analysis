import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useParams, useNavigate, Link } from 'react-router-dom';

export default function IngredientForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [ingredient, setIngredient] = useState({
        Ingredient_Name: '',
        Unit_Of_Measure: '',
        Category: '',
        Notes: ''
    });
    const [nutrition, setNutrition] = useState({
        Calories: 0,
        Carbohydrates_g: 0,
        Protein_g: 0,
        Fat_g: 0,
        Fiber_g: 0,
        Vitamins: '',
        Minerals: ''
    });

    useEffect(() => {
        if (isEditing) {
            setLoading(true);
            api.get(`/ingredients/${id}`)
                .then(res => {
                    const { nutrition, ...ingData } = res.data;
                    setIngredient(ingData);
                    if (nutrition) {
                        setNutrition(nutrition);
                    }
                    setLoading(false);
                })
                .catch(err => {
                    setError('Failed to load ingredient');
                    setLoading(false);
                });
        }
    }, [id, isEditing]);

    const handleIngredientChange = (e) => {
        const { name, value } = e.target;
        setIngredient(prev => ({ ...prev, [name]: value }));
    };

     const handleNutritionChange = (e) => {
        const { name, value } = e.target;
        setNutrition(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        const fullData = {
            ...ingredient,
            nutrition: nutrition
        };
        
        try {
            if (isEditing) {
                await api.put(`/ingredients/${id}`, fullData);
            } else {
                await api.post('/ingredients', fullData);
            }
            navigate('/ingredients');
        } catch (err) {
            setError('Failed to save ingredient.');
        }
    };

    if (loading) return <div className="container"><p>Loading form...</p></div>;

    return (
        <div className="form-container" style={{maxWidth: '800px'}}>
            <h2 className="form-title">{isEditing ? 'Edit Ingredient' : 'Create New Ingredient'}</h2>
            <form onSubmit={handleSubmit}>
                <h3>Ingredient Details</h3>
                <div className="form-group">
                    <label>Name</label>
                    <input type="text" name="Ingredient_Name" value={ingredient.Ingredient_Name || ''} onChange={handleIngredientChange} required />
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                    <div className="form-group">
                        <label>Base Unit (e.g., 100g)</label>
                        <input type="text" name="Unit_Of_Measure" value={ingredient.Unit_Of_Measure || ''} onChange={handleIngredientChange} placeholder="e.g., 100g, 100ml" required />
                    </div>
                     <div className="form-group">
                        <label>Category</label>
                        <input type="text" name="Category" value={ingredient.Category || ''} onChange={handleIngredientChange} placeholder="e.g., Dairy, Vegetable" />
                    </div>
                </div>
                <div className="form-group">
                    <label>Notes</label>
                    <input type="text" name="Notes" value={ingredient.Notes || ''} onChange={handleIngredientChange} />
                </div>
                
                <h3 style={{marginTop: '2rem'}}>Nutrition (per {ingredient.Unit_Of_Measure || 'base unit'})</h3>
                 <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
                    <div className="form-group">
                        <label>Calories</label>
                        <input type="number" step="0.1" name="Calories" value={nutrition.Calories || 0} onChange={handleNutritionChange} />
                    </div>
                    <div className="form-group">
                        <label>Protein (g)</label>
                        <input type="number" step="0.1" name="Protein_g" value={nutrition.Protein_g || 0} onChange={handleNutritionChange} />
                    </div>
                    <div className="form-group">
                        <label>Carbs (g)</label>
                        <input type="number" step="0.1" name="Carbohydrates_g" value={nutrition.Carbohydrates_g || 0} onChange={handleNutritionChange} />
                    </div>
                    <div className="form-group">
                        <label>Fat (g)</label>
                        <input type="number" step="0.1" name="Fat_g" value={nutrition.Fat_g || 0} onChange={handleNutritionChange} />
                    </div>
                    <div className="form-group">
                        <label>Fiber (g)</label>
                        <input type="number" step="0.1" name="Fiber_g" value={nutrition.Fiber_g || 0} onChange={handleNutritionChange} />
                    </div>
                 </div>
                 <div className="form-group">
                    <label>Vitamins</label>
                    <input type="text" name="Vitamins" value={nutrition.Vitamins || ''} onChange={handleNutritionChange} placeholder="e.g., A, C, B12" />
                </div>
                 <div className="form-group">
                    <label>Minerals</label>
                    <input type="text" name="Minerals" value={nutrition.Minerals || ''} onChange={handleNutritionChange} placeholder="e.g., Iron, Calcium" />
                </div>

                {error && <p className="error-message">{error}</p>}

                <div className="form-group" style={{marginTop: '1.5rem', display: 'flex', gap: '1rem'}}>
                    <button type="submit" className="form-button">
                        {isEditing ? 'Save Changes' : 'Create Ingredient'}
                    </button>
                    <Link to="/ingredients" className="button button-secondary">
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}