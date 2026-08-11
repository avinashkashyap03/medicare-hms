import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/assets/styles/variables.css';
import '@/assets/styles/layout.css';
import '@/assets/styles/dashboard.css';
import '@/assets/styles/patients.css';
import '@/assets/styles/appointments.css';
import '@/assets/styles/departments.css';
import '@/assets/styles/billing.css';
import '@/assets/styles/inventory.css';
import '@/assets/styles/reports.css';
import '@/assets/styles/main.css';
import '@/assets/styles/auth.css';
import App from '@/App.jsx';
import { ThemeProvider } from '@/context/ThemeContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
