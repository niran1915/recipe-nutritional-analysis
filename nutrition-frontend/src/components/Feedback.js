import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// --- NEW: StarRating Component (moved from Feedback.js) ---
// We make it reusable for both displaying and editing
const StarRating = ({ rating, setRating }) => {
    const [hover, setHover] = useState(0);
    const isEditable = setRating !== null; // Check if the setRating function was passed

    return (
        <div 
            className="rating-stars" 
            onMouseLeave={isEditable ? () => setHover(0) : null}
        >
            {[...Array(5)].map((_, index) => {
                const ratingValue = index + 1;
                return (
                    <span
                        key={ratingValue}
                        className={ratingValue <= (hover || rating) ? 'star filled' : 'star'}
                        onClick={isEditable ? () => setRating(ratingValue) : null}
                        onMouseEnter={isEditable ? () => setHover(ratingValue) : null}
                        style={{ cursor: isEditable ? 'pointer' : 'default' }}
                    >
                        &#9733;
                    </span>
                );
            })}
        </div>
    );
};

// --- NEW: FeedbackItem Component ---
// This component manages the state for a *single* review
const FeedbackItem = ({ fb, currentUserId, onRefresh }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editRating, setEditRating] = useState(fb.Rating);
    const [editComments, setEditComments] = useState(fb.Comments);
    const [error, setError] = useState('');

    const isOwner = fb.User_ID === currentUserId;

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/feedback/${fb.Feedback_ID}`, {
                Rating: editRating,
                Comments: editComments
            });
            setIsEditing(false);
            onRefresh(); // Tell the parent to refetch all feedback
        } catch (err) {
            setError('Failed to update review.');
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this review?')) {
            try {
                await api.delete(`/feedback/${fb.Feedback_ID}`);
                onRefresh(); // Tell the parent to refetch all feedback
            } catch (err) {
                setError('Failed to delete review.');
            }
        }
    };

    return (
        <li className="feedback-item">
            {error && <p className="error-message">{error}</p>}
            {isEditing ? (
                // --- EDITING VIEW ---
                <form onSubmit={handleUpdate}>
                    <div className="form-group">
                        <label>Your Rating</label>
                        <StarRating rating={editRating} setRating={setEditRating} />
                    </div>
                    <div className="form-group">
                        <label>Your Comments</label>
                        <textarea 
                            value={editComments} 
                            onChange={(e) => setEditComments(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" className="button" style={{width: 'auto'}}>Save</button>
                        <button type="button" className="button button-secondary" style={{width: 'auto'}} onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                </form>
            ) : (
                // --- DISPLAY VIEW ---
                <>
                    <div className="feedback-item-header">
                        <strong>{fb.User_Name}</strong>
                        <span className="stars">
                            {'★'.repeat(fb.Rating)}
                            {'☆'.repeat(5 - fb.Rating)}
                        </span>
                    </div>
                    <p style={{margin: 0}}>{fb.Comments}</p>
                    <small style={{color: '#6b7280'}}>{new Date(fb.Date).toLocaleDateString()}</small>
                    
                    {isOwner && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setIsEditing(true)} className="button button-secondary" style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem'}}>Edit</button>
                            <button onClick={handleDelete} className="button button-danger" style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem'}}>Delete</button>
                        </div>
                    )}
                </>
            )}
        </li>
    );
};

// --- Main Feedback Component ---
export default function Feedback({ recipeId }) {
    const [feedbackList, setFeedbackList] = useState([]);
    const [rating, setRating] = useState(0);
    const [comments, setComments] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    
    // Get the current user's ID so we know which reviews they own
    const currentUserId = parseInt(localStorage.getItem('user_id'), 10);

    const fetchFeedback = useCallback(async () => {
        try {
            const res = await api.get(`/recipes/${recipeId}/feedback`);
            setFeedbackList(res.data);
        } catch (err) {
            setError("Failed to fetch feedback");
        } finally {
            setLoading(false);
        }
    }, [recipeId]);

    useEffect(() => {
        fetchFeedback();
    }, [fetchFeedback]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            setError('Please select a rating.');
            return;
        }
        setError('');
        try {
            await api.post(`/recipes/${recipeId}/feedback`, {
                Rating: rating,
                Comments: comments
            });
            // Reset form and refresh list
            setRating(0);
            setComments('');
            fetchFeedback(); // Re-fetch all feedback
        } catch (err) {
            setError('Failed to submit feedback.');
        }
    };

    return (
        <div className="feedback-section">
            <h2>Feedback</h2>
            <form className="feedback-form" onSubmit={handleSubmit}>
                <h3>Leave a Review</h3>
                <div className="form-group">
                    <label>Rating</label>
                    <StarRating rating={rating} setRating={setRating} />
                </div>
                <div className="form-group">
                    <label>Comments</label>
                    <textarea 
                        value={comments} 
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="What did you think?"
                    />
                </div>
                {error && <p className="error-message">{error}</p>}
                <button type="submit" className="form-button" style={{width: 'auto'}}>Submit Review</button>
            </form>

            <h3>All Reviews</h3>
            {loading ? <p>Loading reviews...</p> : (
                feedbackList.length === 0 ? (
                    <p>No feedback yet.</p>
                ) : (
                    <ul className="feedback-list">
                        {feedbackList.map(fb => (
                            <FeedbackItem 
                                key={fb.Feedback_ID} 
                                fb={fb} 
                                currentUserId={currentUserId}
                                onRefresh={fetchFeedback} 
                            />
                        ))}
                    </ul>
                )
            )}
        </div>
    );
}