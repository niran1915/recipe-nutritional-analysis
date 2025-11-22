import axios from 'axios';

// Create a central 'api' instance
const api = axios.create({
    baseURL: 'http://127.0.0.1:5000/api' // Your Flask API's base URL
});

// This "interceptor" runs BEFORE every request
api.interceptors.request.use(
    (config) => {
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        if (token) {
            // If the token exists, add it to the 'Authorization' header
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// This interceptor runs on every RESPONSE
api.interceptors.response.use(
    // If the response is successful (2xx), just return it
    (response) => {
        return response;
    },
    // If the response is an error
    (error) => {
        // Check if it's a 401 Unauthorized error (e.g., token expired)
        if (error.response && error.response.status === 401) {
            
            // This means the token is expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('role');
            
            // Fire the authChange event to update the navbar
            window.dispatchEvent(new Event('authChange'));
            
            // Redirect the user to the login page
            window.location.href = '/login';
        }
        
        // Return the error so the component can still catch it
        return Promise.reject(error);
    }
);

export default api;