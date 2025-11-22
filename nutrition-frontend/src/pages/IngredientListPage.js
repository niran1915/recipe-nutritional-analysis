import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function IngredientListPage() {
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchIngredients = async () => {
        try {
            setLoading(true);
            // This now fetches ingredients AND their nutrition data
            const response = await api.get('/ingredients'); 
            setIngredients(response.data);
        } catch (err) {
            setError('Could not fetch ingredients.');
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchIngredients();
    }, []);

     const handleDelete = async (id) => {
        if (window.confirm('Are you sure? This will fail if the ingredient is used in any recipes.')) {
            try {
                await api.delete(`/ingredients/${id}`);
                fetchIngredients(); // Refresh list
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to delete ingredient.');
            }
        }
    };

    if (loading) return <div className="container"><p>Loading ingredients...</p></div>;

    return (
        <div className="container">
            <div className="page-header">
                <h1>Ingredients</h1>
                <Link to="/ingredients/new" className="button">
                    + Add New Ingredient
                </Link>
            </div>
            {error && <p className="error-message">{error}</p>}
            
            {/* Make the table container scrollable if too wide */}
            <div style={{ overflowX: 'auto' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Base Unit</th>
                            {/* --- NEW COLUMNS --- */}
                            <th>Calories</th>
                            <th>Protein (g)</th>
                            <th>Carbs (g)</th>
                            <th>Fat (g)</th>
                            <th>Fiber (g)</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ingredients.map(ing => (
                            <tr key={ing.Ingredient_ID}>
                                <td>{ing.Ingredient_Name}</td>
                                <td>{ing.Category}</td>
                                <td>{ing.Unit_Of_Measure}</td>
                                
                                {/* --- NEW CELLS --- */}
                                {/* We check if 'ing.nutrition' exists before trying to access its properties */}
                                <td>{ing.nutrition ? ing.nutrition.Calories : '0'}</td>
                                <td>{ing.nutrition ? ing.nutrition.Protein_g : '0'}</td>
                                <td>{ing.nutrition ? ing.nutrition.Carbohydrates_g : '0'}</td>
                                <td>{ing.nutrition ? ing.nutrition.Fat_g : '0'}</td>
                                <td>{ing.nutrition ? ing.nutrition.Fiber_g : '0'}</td>

                                <td className="actions-cell">
                                    <Link to={`/ingredients/edit/${ing.Ingredient_ID}`} className="button button-secondary">Edit</Link>
                                    <button onClick={() => handleDelete(ing.Ingredient_ID)} className="button button-danger">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}