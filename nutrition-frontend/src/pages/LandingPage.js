// src/pages/LandingPage.js
import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
    return (
        <div className="landing-page">
            <div className="landing-background"></div> {/* This div holds the background image */}
            <div className="landing-content">
                <h1>Achieve Your Health Goals with NutritionDB</h1>
                <p>
                    Track your meals, manage recipes, plan your diet, and analyze your nutrition effortlessly.
                    Start your journey to a healthier you today.
                </p>
                <div className="landing-actions">
                    <Link to="/signup" className="button primary landing-button">
                        Sign Up For Free
                    </Link>
                    <Link to="/login" className="button secondary landing-button">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}