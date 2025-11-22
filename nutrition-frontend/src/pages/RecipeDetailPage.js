import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Feedback from '../components/Feedback';

export default function RecipeDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // --- 1. ADD NEW STATE FOR CALORIES ---
    const [totalCalories, setTotalCalories] = useState(0);

    // State for the "Add Ingredient" form
    const [allIngredients, setAllIngredients] = useState([]);
    const [selectedIngredient, setSelectedIngredient] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('');

    // Fetch recipe, ingredients, and calories
    const fetchRecipe = useCallback(async () => {
        try {
            setLoading(true);
            
            // --- 2. CALL BOTH API ROUTES IN PARALLEL ---
            const [recipeRes, ingredientsRes, caloriesRes] = await Promise.all([
                api.get(`/recipes/${id}`),
                api.get('/ingredients'),
                api.get(`/recipes/${id}/calories`) // <-- This calls your GetRecipeCalories function
            ]);
            // --- END OF CHANGE ---

            setRecipe(recipeRes.data);
            setAllIngredients(ingredientsRes.data);
            setTotalCalories(caloriesRes.data.Total_Calories); // <-- 3. SET THE CALORIE STATE

        } catch (err) {
            setError('Could not fetch recipe details.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchRecipe();
    }, [fetchRecipe]);

    const handleDeleteRecipe = async () => {
        if (window.confirm('Are you sure you want to delete this recipe?')) {
            try {
                await api.delete(`/recipes/${id}`);
                navigate('/recipes');
            } catch (err) {
                setError('Could not delete recipe.');
            }
        }
    };

    const handleAddIngredient = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/recipes/${id}/ingredients`, {
                Ingredient_ID: selectedIngredient,
                Quantity: quantity,
                Unit: unit
            });
            fetchRecipe(); // Refresh all data (including calories)
            setSelectedIngredient('');
            setQuantity('');
            setUnit('');
        } catch (err) {
            setError('Failed to add ingredient.');
        }
    };

    const handleDeleteIngredient = async (recipeIngredientId) => {
        try {
            await api.delete(`/recipe-ingredients/${recipeIngredientId}`);
            fetchRecipe(); // Refresh all data (including calories)
        } catch (err) {
            setError('Failed to delete ingredient.');
        }
    };

    if (loading) return <div className="container"><p>Loading...</p></div>;
    if (error) return <div className="container"><p className="error-message">{error}</p></div>;
    if (!recipe) return null;

    return (
        <div className="detail-container">
            <div className="detail-header">
                <div>
                    <h1>{recipe.Recipe_Name}</h1>
                    <p>{recipe.Description}</p>
                </div>
                <div className="detail-header-actions">
                    <Link to={`/recipes/edit/${id}`} className="button button-secondary">Edit</Link>
                    <button onClick={handleDeleteRecipe} className="button button-danger">Delete</button>
                </div>
            </div>

            <div className="detail-grid">
                <div className="detail-main">
                    <h3>Instructions</h3>
                    <pre>{recipe.Instructions}</pre>
                    
                    <Feedback recipeId={id} />
                </div>
                <div className="detail-sidebar">
                    <h3>Details</h3>
                    <div className="detail-info-grid">
                        {/* --- 4. RENDER THE TOTAL CALORIES --- */}
                        <div className="info-item">
                            <strong>Total Calories:</strong> 
                            <span style={{color: '#16a34a', fontWeight: 'bold'}}>{totalCalories.toFixed(0)} kcal</span>
                        </div>
                        <div className="info-item">
                            <strong>Serving Size:</strong> <span>{recipe.Serving_Size}</span>
                        </div>
                        {/* --- END OF CHANGE --- */}
                        <div className="info-item">
                            <strong>Cuisine:</strong> <span>{recipe.Cuisine_Type}</span>
                        </div>
                        <div className="info-item">
                            <strong>Difficulty:</strong> <span>{recipe.Difficulty_Level}</span>
                        </div>
                        <div className="info-item">
                            <strong>Prep Time:</strong> <span>{recipe.Preparation_Time_minutes} min</span>
                        </div>
                        <div className="info-item">
                            <strong>Cook Time:</strong> <span>{recipe.Cooking_Time_minutes} min</span>
                        </div>
                    </div>

                    <h3>Ingredients</h3>
                    {recipe.ingredients.length === 0 ? (
                        <p>No ingredients added yet.</p>
                    ) : (
                        <ul className="list">
                            {recipe.ingredients.map(ing => (
                                <li key={ing.RecipeIngredient_ID} className="list-item">
                                    <span>
                                        {ing.Quantity} {ing.Unit} - {ing.Ingredient_Name}
                                    </span>
                                    <button onClick={() => handleDeleteIngredient(ing.RecipeIngredient_ID)}>
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    
                    <h3 style={{marginTop: '2rem'}}>Add Ingredient</h3>
                    <form onSubmit={handleAddIngredient}>
                        <div className="form-group">
                            <label>Ingredient</label>
                            <select value={selectedIngredient} onChange={(e) => setSelectedIngredient(e.target.value)} required>
                                <option value="" disabled>Select...</option>
                                {allIngredients.map(ing => (
                                    <option key={ing.Ingredient_ID} value={ing.Ingredient_ID}>
                                        {ing.Ingredient_Name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Quantity</label>
                            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Unit</label>
                            <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g., grams, ml, cups" required />
                        </div>
                        <button type="submit" className="form-button">Add</button>
                    </form>
                </div>
            </div>
        </div>
    );
}