import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './assets/styles/variables.css';
import './assets/styles/layout.css';
import './assets/styles/dashboard.css';
import './assets/styles/main.css';
import './assets/styles/auth.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
