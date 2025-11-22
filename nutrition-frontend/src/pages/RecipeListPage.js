import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

const RecipeCard = ({ recipe }) => (
    <div className="card">
        <div className="card-content">
            <h3 className="card-title">{recipe.Recipe_Name}</h3>
            <p className="card-description">{recipe.Description || 'No description available.'}</p>
            <div className="card-footer">
                <Link to={`/recipes/${recipe.Recipe_ID}`} className="button">
                    View Recipe &rarr;
                </Link>
                <span className="card-tag">
                    {recipe.Difficulty_Level}
                </span>
            </div>
        </div>
    </div>
);

export default function RecipeListPage() {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRecipes = async () => {
            try {
                const response = await api.get('/recipes');
                setRecipes(response.data);
            } catch (err) {
                setError('Could not fetch recipes. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchRecipes();
    }, []);

    if (loading) return <div className="container"><p>Loading recipes...</p></div>;
    if (error) return <div className="container"><p className="error-message">{error}</p></div>;

    return (
        <div className="container">
            <div className="page-header">
                <h1>My Recipes</h1>
                <Link to="/recipes/new" className="button">
                    + Add New Recipe
                </Link>
            </div>
            {recipes.length === 0 ? (
                <p>You haven't created any recipes yet.</p>
            ) : (
                <div className="card-grid">
                    {recipes.map(recipe => (
                        <RecipeCard key={recipe.Recipe_ID} recipe={recipe} />
                    ))}
                </div>
            )}
        </div>
    );
}