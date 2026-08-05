import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import SignIn from './pages/auth/SignIn.jsx';
import SignUp from './pages/auth/SignUp.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<SignIn />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;