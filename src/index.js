import React from 'react';
import ReactDOM from 'react-dom/client';
import './assets/styles/fonts.css';
import './assets/styles/index.css';
import './assets/styles/font-overrides.css';
import App from './components/layout/App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
