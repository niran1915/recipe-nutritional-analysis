import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import CSS
import './styles/App.css';
import './styles/Layout.css';
import './styles/Form.css';
import './styles/ListAndDetail.css';
import './styles/Feedback.css';
import './styles/Dashboard.css'; // <-- NEW
import './styles/Dashboard1.css';
import './styles/LandingPage.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);